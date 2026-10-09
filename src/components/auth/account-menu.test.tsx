import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { AccountMenu } from './account-menu'

const profile = { name: '사용자', email: 'demo@example.test' }
describe('계정 메뉴의 서버 렌더링 경계', () => {
  it.each(['profile', 'mobile', 'oidc'] as const)(
    '%s는 hydration 전에 접근 가능한 버튼을 그리고 연결되지 않은 팝업 ID를 만들지 않는다',
    mode => {
      const html = renderToString(
        <AccountMenu
          profile={profile}
          mode={mode}
          logout={<button>로그아웃</button>}
        />
      )
      expect(html).toContain(
        mode === 'mobile' ? 'aria-label="내 정보"' : 'aria-label="계정 메뉴"'
      )
      expect(html).toContain('disabled=""')
      expect(html).not.toContain('radix-')
      expect(html).not.toContain('aria-controls=')
      if (mode === 'profile') {
        expect(html).toContain(profile.name)
        expect(html).toContain(profile.email)
      }
    }
  )
})
