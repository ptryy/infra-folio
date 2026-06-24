import { useState, useEffect } from 'react'
import GithubFeed from './GithubFeed'

type StatusData = {
  status: string
  region: string
  uptimeMs: number
  timestamp: string
}

type Props = {
  enabled: boolean
  apiBase: string
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export default function LiveTerminal({ enabled, apiBase }: Props) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    async function fetchStatus() {
      try {
        const res = await fetch(`${apiBase}/status`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as StatusData
        setStatus(data)
        setStatusError(null)
      } catch {
        setStatusError('Worker unreachable')
      }
    }

    fetchStatus()
  }, [enabled, apiBase])

  if (!enabled) return null

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '12px',
      fontFamily: 'var(--font-mono, monospace)',
      overflow: 'hidden',
    }}>
      {/* Terminal title bar */}
      <div style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ marginLeft: '0.5rem', color: '#8b949e', fontSize: '0.8rem' }}>infra-folio — live terminal</span>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Status panel */}
        <div>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ worker status
          </p>
          {statusError ? (
            <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{statusError}</p>
          ) : status ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#8b949e' }}>status: </span>
                <span style={{ color: '#28c840', fontWeight: 600 }}>{status.status}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>region: </span>
                <span style={{ color: '#e6edf3' }}>{status.region}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>uptime: </span>
                <span style={{ color: '#e6edf3' }}>{formatUptime(status.uptimeMs)}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>as of: </span>
                <span style={{ color: '#e6edf3' }}>{new Date(status.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Connecting…</p>
          )}
        </div>

        {/* GitHub feed */}
        <div>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ github activity
          </p>
          <GithubFeed apiBase={apiBase} />
        </div>
      </div>
    </div>
  )
}
