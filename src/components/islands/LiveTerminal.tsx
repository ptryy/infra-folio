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
    <div className="crt" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
      {/* Terminal title bar */}
      <div className="crt-bar">
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#39ff8a', display: 'inline-block' }} />
        infra-folio@edge — live tail
        <span style={{ marginLeft: 'auto', color: '#22e3ff' }}>● connected</span>
      </div>

      <div className="crt-body" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Status panel */}
        <div>
          <p style={{ color: '#22e3ff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ worker status
          </p>
          {statusError ? (
            <p style={{ color: '#ff7a18', fontSize: '0.875rem' }}>{statusError}</p>
          ) : status ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#6f8694' }}>status: </span>
                <span style={{ color: '#39ff8a', fontWeight: 600 }}>{status.status}</span>
              </div>
              <div>
                <span style={{ color: '#6f8694' }}>region: </span>
                <span style={{ color: '#cfe8f0' }}>{status.region}</span>
              </div>
              <div>
                <span style={{ color: '#6f8694' }}>uptime: </span>
                <span style={{ color: '#cfe8f0' }}>{formatUptime(status.uptimeMs)}</span>
              </div>
              <div>
                <span style={{ color: '#6f8694' }}>as of: </span>
                <span style={{ color: '#cfe8f0' }}>{new Date(status.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#6f8694', fontSize: '0.875rem' }}>Connecting…</p>
          )}
        </div>

        {/* GitHub feed */}
        <div>
          <p style={{ color: '#22e3ff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ github activity
          </p>
          <GithubFeed apiBase={apiBase} />
        </div>
      </div>
    </div>
  )
}
