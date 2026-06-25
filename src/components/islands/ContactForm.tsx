import { useState } from 'react'

type FormState = {
  name: string
  email: string
  message: string
}

type FormErrors = Partial<FormState>

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!form.message.trim()) errors.message = 'Message is required'
  return errors
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  background: '#0a0d14',
  border: '1px solid rgba(34,227,255,0.35)',
  borderRadius: '3px',
  color: '#cfe8f0',
  fontSize: '0.9rem',
  fontFamily: "var(--font-mono, monospace)",
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-muted)',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.4rem',
}

const errorStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '0.8rem',
  marginTop: '0.25rem',
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setServerError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: '2rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', textAlign: 'center' }}>
        <p style={{ color: '#10b981', fontWeight: 600, fontSize: '1.1rem' }}>Message sent!</p>
        <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Thanks for reaching out. I'll get back to you within 24–48 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
      <div>
        <label htmlFor="name" style={labelStyle}>Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          style={fieldStyle}
          placeholder="Jane Smith"
          autoComplete="name"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          style={fieldStyle}
          placeholder="jane@company.com"
          autoComplete="email"
        />
        {errors.email && <p style={errorStyle}>{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="message" style={labelStyle}>Message</label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          style={{ ...fieldStyle, minHeight: '140px', resize: 'vertical' }}
          placeholder="Tell me about your project or what you'd like to work on together..."
        />
        {errors.message && <p style={errorStyle}>{errors.message}</p>}
      </div>

      {serverError && (
        <p style={{ ...errorStyle, fontSize: '0.875rem' }}>{serverError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn btn--primary"
        style={{
          padding: '0.75rem 2rem',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.95rem',
          cursor: submitting ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
          transition: 'background 0.2s',
        }}
      >
        {submitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
