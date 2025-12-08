import { runCodex, readStdin } from './codex-sdk-core.mjs'

async function main() {
  const payload = await readStdin()
  if (!payload) {
    throw new Error('Missing input payload for Codex SDK runner')
  }
  const parsed = JSON.parse(payload)
  await runCodex(parsed)
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err?.message || String(err), finished: true }))
  process.exit(1)
})

export { runCodex } from './codex-sdk-core.mjs'
