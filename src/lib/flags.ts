type FlagEnv = Record<string, string | undefined>

function resolveFlag(env: FlagEnv, key: string, defaultValue: string): boolean {
  return (env[key] ?? defaultValue) === 'true'
}

export function getFlags(runtime: FlagEnv) {
  return {
    LIVE_TERMINAL: resolveFlag(runtime, 'LIVE_TERMINAL', 'false'),
    CONTACT_FORM: resolveFlag(runtime, 'CONTACT_FORM', 'true'),
  } as const
}

// Build-time convenience: reads from Astro's import.meta.env.
// For SSR routes, call getFlags(Astro.locals.runtime.env) instead.
export const flags = getFlags(
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as FlagEnv)
    : {}
)
