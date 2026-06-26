import { useState, useEffect, useCallback } from 'react'

type GithubEvent = {
  id: string
  type: string
  repo: { name: string; url: string }
  created_at: string
  payload: Record<string, unknown>
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    PushEvent: 'pushed to',
    PullRequestEvent: 'opened PR in',
    IssuesEvent: 'opened issue in',
    ForkEvent: 'forked',
    WatchEvent: 'starred',
    CreateEvent: 'created branch in',
    DeleteEvent: 'deleted branch in',
  }
  return map[type] ?? type.replace('Event', '').toLowerCase() + ' in'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type Props = {
  apiBase: string
}

export default function GithubFeed({ apiBase }: Props) {
  const [events, setEvents] = useState<GithubEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/github/feed`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { events: GithubEvent[] }
      setEvents(data.events)
      setError(null)
    } catch {
      setError('Failed to load GitHub activity')
    }
  }, [apiBase])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  if (error) {
    return <p style={{ color: '#ff7a18', fontSize: '0.875rem' }}>{error}</p>
  }

  if (!events) {
    return <p style={{ color: '#6f8694', fontSize: '0.875rem' }}>Loading GitHub activity…</p>
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {events.slice(0, 8).map(event => (
        <li key={event.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#39ff8a', fontFamily: 'monospace', flexShrink: 0 }}>›</span>
          <span>
            <span style={{ color: '#6f8694' }}>{formatEventType(event.type)} </span>
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#22e3ff', fontWeight: 500 }}
            >
              {event.repo.name.split('/')[1]}
            </a>
            <span style={{ color: '#5a6b7a', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
              {timeAgo(event.created_at)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
