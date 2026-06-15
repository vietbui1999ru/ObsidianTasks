#!/usr/bin/env -S npx tsx
/**
 * resumeloop CLI (ADR 0001 §11). Run via tsx today; wired as a global `bin`
 * when the tool is packaged for npm (#11).
 *
 *   resumeloop init [dir]      scaffold a files-canonical workspace (default: cwd)
 *   resumeloop reindex [dir]   rebuild .cache/index.db from the job files
 *   resumeloop onboard [dir]   deterministic setup: pick + validate a provider, profile basics
 */
import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { initWorkspace } from '../lib/workspace/init'
import { reindex } from '../lib/workspace/index-db'
import { workspaceRoot, profilePath } from '../lib/workspace/paths'
import { validateProvider, setProfileBasics } from '../lib/workspace/onboard'
import { listProviders, setActiveProviderId } from '../lib/providers/active-provider'

/**
 * A prompt reader that works both interactively (TTY → readline) and for piped/
 * scripted input (non-TTY → buffer stdin upfront and serve a line per prompt).
 * readline/promises closes on stdin EOF, which crashes mid-wizard during the
 * async validation spawn when input is piped — this sidesteps that.
 */
function makeAsker(): { ask: (q: string) => Promise<string>; close: () => void } {
  if (process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    return { ask: q => rl.question(q), close: () => rl.close() }
  }
  let lines: string[] = []
  try { lines = fs.readFileSync(0, 'utf8').split('\n') } catch { /* no stdin */ }
  let i = 0
  return {
    ask: async q => { const v = lines[i++] ?? ''; console.log(q + v); return v },
    close: () => {},
  }
}

/** Phase-1 onboarding: detect → pick → validate (test spawn) → profile basics. No AI content. */
async function onboard(root: string): Promise<number> {
  // Anchor workspace + provider config to this root for the whole command, so
  // setActiveProviderId (which reads RESUMELOOP_HOME) writes into the workspace.
  process.env.RESUMELOOP_HOME = root
  if (!fs.existsSync(profilePath(root))) initWorkspace(root)
  const rl = makeAsker()
  try {
    const providers = await listProviders()
    const installed = providers.filter(p => p.installed)
    console.log('\nDetected AI providers:')
    for (const p of providers) {
      console.log(`  ${p.installed ? '●' : '○'} ${p.id} [${p.transport}]${p.installed ? '' : '  (not detected)'}`)
    }
    if (installed.length === 0) {
      console.error('\nNo providers detected. Install a CLI (claude/codex/gemini/opencode) or start ollama, then re-run.')
      return 1
    }

    let chosen = ''
    const ids = installed.map(p => p.id)
    while (!ids.includes(chosen)) {
      chosen = (await rl.ask(`\nPick a provider [${ids.join(' / ')}]: `)).trim()
      if (!ids.includes(chosen)) console.log(`  "${chosen}" is not one of the detected options.`)
    }

    process.stdout.write(`Validating ${chosen} with a test spawn… `)
    const v = await validateProvider(chosen)
    console.log(v.ok ? 'ok ✓' : `failed ✗\n  ${v.detail}`)
    if (!v.ok) {
      const ans = (await rl.ask('Set it active anyway? [y/N]: ')).trim().toLowerCase()
      if (ans !== 'y') { console.error('Aborted — provider not validated.'); return 1 }
    }
    setActiveProviderId(chosen)

    const name = (await rl.ask('\nYour name: ')).trim()
    const email = (await rl.ask('Email: ')).trim()
    const location = (await rl.ask('Location: ')).trim()
    const targets = (await rl.ask('Target roles (comma-separated): ')).trim()
    setProfileBasics(root, {
      name: name || undefined,
      email: email || undefined,
      location: location || undefined,
      targetRoles: targets ? targets.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    })

    console.log(`\n✓ Onboarding complete — provider "${chosen}" active, profile at ${profilePath(root)}`)
    console.log('  next: add jobs to data/jobs/*.md, then `resumeloop reindex`')
    return 0
  } finally {
    rl.close()
  }
}

async function main(argv: string[]): Promise<number> {
  const [cmd, dir] = argv
  const resolveRoot = (fallback: string) => (dir ? path.resolve(dir) : fallback)
  switch (cmd) {
    case 'init': {
      const root = resolveRoot(process.cwd())
      const { created } = initWorkspace(root)
      console.log(`✓ workspace ready at ${root} (${created.length} path(s) created)`)
      console.log('  next: `resumeloop onboard` to pick a provider + fill your profile')
      return 0
    }
    case 'reindex': {
      const root = resolveRoot(workspaceRoot())
      const { jobs } = reindex(root)
      console.log(`✓ reindexed ${jobs} job(s) → ${root}/.cache/index.db`)
      return 0
    }
    case 'onboard':
      return onboard(resolveRoot(workspaceRoot()))
    default:
      console.error('usage: resumeloop <init|reindex|onboard> [dir]')
      return 1
  }
}

main(process.argv.slice(2)).then(code => process.exit(code))
