import { describe, it, expect } from 'vitest'
import { getFlags } from '../flags'

describe('getFlags', () => {
  it('defaults LIVE_TERMINAL to false and CONTACT_FORM to true', () => {
    const flags = getFlags({})
    expect(flags.LIVE_TERMINAL).toBe(false)
    expect(flags.CONTACT_FORM).toBe(true)
  })

  it('enables LIVE_TERMINAL when env var is "true"', () => {
    const flags = getFlags({ LIVE_TERMINAL: 'true' })
    expect(flags.LIVE_TERMINAL).toBe(true)
  })

  it('disables CONTACT_FORM when env var is "false"', () => {
    const flags = getFlags({ CONTACT_FORM: 'false' })
    expect(flags.CONTACT_FORM).toBe(false)
  })

  it('ignores case — only exact "true" string enables a flag', () => {
    const flags = getFlags({ LIVE_TERMINAL: 'True', CONTACT_FORM: 'TRUE' })
    expect(flags.LIVE_TERMINAL).toBe(false)
    expect(flags.CONTACT_FORM).toBe(false)
  })
})
