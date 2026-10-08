import * as oidc from 'openid-client'
import { z } from 'zod'
import { oidcConfig, OidcError } from './config'

export const flowSchema = z
  .object({
    state: z.string(),
    nonce: z.string(),
    verifier: z.string(),
    next: z.string(),
  })
  .readonly()
export type LoginFlow = z.infer<typeof flowSchema>
export const tokenSchema = z
  .object({
    issuer: z.string(),
    subject: z.string().min(1),
    displayName: z.string(),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    idToken: z.string().min(1),
    accessExpiresAt: z.number(),
  })
  .readonly()
export type AuthTokens = z.infer<typeof tokenSchema>

let discovery: Promise<oidc.Configuration> | undefined
async function provider(): Promise<oidc.Configuration> {
  if (!discovery) {
    const config = oidcConfig()
    discovery = oidc
      .discovery(
        new URL(config.issuer),
        config.clientId,
        config.clientSecret
          ? { client_secret: config.clientSecret }
          : undefined,
        config.clientSecret
          ? oidc.ClientSecretPost(config.clientSecret)
          : oidc.None(),
        {
          timeout: 5,
          execute:
            config.allowLocalHttp && new URL(config.issuer).protocol === 'http:'
              ? [oidc.allowInsecureRequests]
              : [],
        }
      )
      .then(configuration => {
        oidc.enableNonRepudiationChecks(configuration)
        return configuration
      })
      .catch((error: unknown) => {
        discovery = undefined
        throw error
      })
  }
  return discovery
}

export async function authorizationUrl(flow: LoginFlow): Promise<URL> {
  return oidc.buildAuthorizationUrl(await provider(), {
    redirect_uri: `${new URL(oidcConfig().origin).origin}/api/auth/oidc/callback`,
    scope: 'openid profile email',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier),
    code_challenge_method: 'S256',
  })
}

type TokenResponse = Awaited<ReturnType<typeof oidc.authorizationCodeGrant>>
function tokensFrom(
  response: TokenResponse,
  previous?: AuthTokens
): AuthTokens {
  const claims = response.claims()
  if (!previous && !claims) throw new OidcError('ID_TOKEN_REQUIRED', 401)
  if (
    previous &&
    claims &&
    (claims.sub !== previous.subject || claims.iss !== previous.issuer)
  ) {
    throw new OidcError('SESSION_IDENTITY_CHANGED', 401)
  }
  return tokenSchema.parse({
    issuer: claims?.iss ?? previous?.issuer,
    subject: claims?.sub ?? previous?.subject,
    displayName:
      claims?.preferred_username ??
      claims?.name ??
      previous?.displayName ??
      claims?.sub,
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previous?.refreshToken,
    idToken: response.id_token ?? previous?.idToken,
    accessExpiresAt: Date.now() + (response.expires_in ?? 0) * 1000,
  })
}

export async function exchangeCode(
  url: URL,
  flow: LoginFlow
): Promise<AuthTokens> {
  const tokens = await oidc.authorizationCodeGrant(await provider(), url, {
    pkceCodeVerifier: flow.verifier,
    expectedState: flow.state,
    expectedNonce: flow.nonce,
    idTokenExpected: true,
  })
  return tokensFrom(tokens)
}

export async function refreshTokens(
  previous: AuthTokens
): Promise<AuthTokens | null> {
  try {
    return tokensFrom(
      await oidc.refreshTokenGrant(await provider(), previous.refreshToken),
      previous
    )
  } catch (error: unknown) {
    if (
      error instanceof oidc.ResponseBodyError &&
      error.error === 'invalid_grant'
    )
      return null
    throw error
  }
}

export async function logoutUrl(tokens: AuthTokens): Promise<URL> {
  return oidc.buildEndSessionUrl(await provider(), {
    id_token_hint: tokens.idToken,
    post_logout_redirect_uri: `${new URL(oidcConfig().origin).origin}/login`,
  })
}
