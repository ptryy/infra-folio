import satori from 'satori'
import { loadFont } from './font'

export type OgParams = {
  title: string
  description: string
  type: 'blog' | 'project'
}

export async function renderOgSvg({ title, description, type }: OgParams): Promise<string> {
  const font = await loadFont()

  const label = type === 'blog' ? 'Blog Post' : 'Project'
  const accentColor = type === 'blog' ? '#6366f1' : '#10b981'

  return satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '60px',
          background: '#0f172a',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      background: accentColor,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 4,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    },
                    children: label,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '16px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#f8fafc',
                      fontSize: 52,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      maxWidth: 900,
                    },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#94a3b8',
                      fontSize: 24,
                      lineHeight: 1.5,
                      maxWidth: 800,
                    },
                    children: description,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                color: '#475569',
                fontSize: 18,
                letterSpacing: 0.5,
              },
              children: 'phuctruong.dev',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Inter', data: font, weight: 400, style: 'normal' }],
    }
  )
}
