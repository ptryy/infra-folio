import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import ContactForm from '../ContactForm'

afterEach(() => vi.restoreAllMocks())

describe('ContactForm', () => {
  it('shows validation error when submitting empty form', async () => {
    render(<ContactForm />)
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John')
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows success message after successful submit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'Hello there!')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeInTheDocument())
  })

  it('shows error message when submit fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'Hello!')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument())
  })
})
