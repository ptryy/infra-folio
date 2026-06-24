import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Comments from '../Comments'

describe('Comments', () => {
  it('renders a container div without crashing', () => {
    const { container } = render(
      <Comments repo="phuctruong/infra-folio" repoId="R_kg..." categoryId="DIC_kw..." />
    )
    expect(container.firstChild).toBeInTheDocument()
  })
})
