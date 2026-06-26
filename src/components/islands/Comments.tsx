import { useEffect, useRef } from 'react'

type Props = {
  repo: string
  repoId: string
  categoryId: string
}

export default function Comments({ repo, repoId, categoryId }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-repo', repo)
    script.setAttribute('data-repo-id', repoId)
    script.setAttribute('data-category-id', categoryId)
    script.setAttribute('data-mapping', 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-theme', 'dark')
    script.setAttribute('data-lang', 'en')
    script.setAttribute('data-loading', 'lazy')

    ref.current.appendChild(script)
  }, [repo, repoId, categoryId])

  return (
    <div
      ref={ref}
      style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(34,227,255,0.18)' }}
    />
  )
}
