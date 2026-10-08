import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'

export async function startRedisFixture() {
  const listener = createServer()
  await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve))
  const address = listener.address()
  if (!address || typeof address === 'string')
    throw new TypeError('Redis fixture requires TCP')
  const port = address.port
  await new Promise<void>(resolve => listener.close(() => resolve()))
  const directory = await mkdtemp(join(tmpdir(), 'stock-insight-redis-'))
  const process = spawn(
    'redis-server',
    [
      '--bind',
      '127.0.0.1',
      '--port',
      String(port),
      '--dir',
      directory,
      '--save',
      '',
      '--appendonly',
      'no',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Redis fixture startup timed out')),
      5000
    )
    process.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    process.once('exit', code => {
      clearTimeout(timer)
      reject(new Error(`Redis fixture exited ${code}`))
    })
    process.stdout.on('data', (chunk: Buffer) => {
      if (chunk.toString('utf8').includes('Ready to accept connections')) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
  return {
    url: `redis://127.0.0.1:${port}`,
    async close() {
      process.kill('SIGTERM')
      await new Promise<void>(resolve => process.once('exit', () => resolve()))
      await rm(directory, { recursive: true, force: true })
    },
  }
}
