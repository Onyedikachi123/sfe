import { render, screen } from '@testing-library/react'
import { Alert } from './Alert'

describe('Alert', () => {
  it('announces its message as an alert, with an optional action', () => {
    render(<Alert action={<button type="button">Try again</button>}>Something failed</Alert>)

    expect(screen.getByRole('alert')).toHaveTextContent('Something failed')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
