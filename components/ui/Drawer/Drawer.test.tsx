import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Drawer } from './Drawer'

function renderOpen(onClose = vi.fn()) {
  render(
    <Drawer open title="Transaction details" onClose={onClose}>
      <p>Reference ACM-12345678</p>
      <a href="#copy">Copy reference</a>
    </Drawer>
  )
  return onClose
}

/** A trigger that opens the drawer and closes it through state, like a real caller. */
function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open details
      </button>
      <Drawer open={open} title="Transaction details" onClose={() => setOpen(false)}>
        <a href="#copy">Copy reference</a>
      </Drawer>
    </>
  )
}

describe('Drawer', () => {
  it('is a modal dialog named by its title', () => {
    renderOpen()
    const dialog = screen.getByRole('dialog', { name: 'Transaction details' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = renderOpen()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when content inside the panel is clicked', async () => {
    const onClose = renderOpen()
    await userEvent.click(screen.getByText('Reference ACM-12345678'))
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose from the close button', async () => {
    const onClose = renderOpen()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = renderOpen()
    // The backdrop is the dialog's parent; it has no role or text of its own.
    await userEvent.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab focus inside the panel', async () => {
    renderOpen()
    const close = screen.getByRole('button', { name: 'Close' })
    const link = screen.getByRole('link', { name: 'Copy reference' })

    await userEvent.tab()
    expect(close).toHaveFocus()
    await userEvent.tab()
    expect(link).toHaveFocus()
    await userEvent.tab()
    expect(close).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(link).toHaveFocus()
  })

  it('moves focus in on open and back to the trigger on close', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open details' })

    await userEvent.click(trigger)
    expect(screen.getByRole('dialog')).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('locks body scroll while open and restores it on close', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Open details' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(document.body.style.overflow).toBe('')
  })
})
