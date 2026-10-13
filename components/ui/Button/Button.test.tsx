import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders a native button that does not submit forms by default', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('fires onClick from the keyboard', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Retry</Button>)

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Convert
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Convert' })
    expect(button).toBeDisabled()
    await userEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('uses aria-label as the accessible name', () => {
    render(<Button iconLeft="close" aria-label="Close details" />)
    expect(screen.getByRole('button', { name: 'Close details' })).toBeInTheDocument()
  })
})
