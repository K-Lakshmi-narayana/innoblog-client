import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import LoginPage from '../pages/LoginPage'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button type="button">Continue with Google</button>,
}))

describe('LoginPage', () => {
  it('shows inline validation when email is missing', async () => {
    render(<LoginPage onRequestOtp={vi.fn()} onVerifyOtp={vi.fn()} session={null} />)

    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }))

    expect(await screen.findByText(/Add an email address to continue/i)).toBeInTheDocument()
  })

  it('requests an OTP and advances to the verify step', async () => {
    const onRequestOtp = vi.fn().mockResolvedValue({ message: 'OTP sent successfully.' })
    const user = userEvent.setup()

    render(<LoginPage onRequestOtp={onRequestOtp} onVerifyOtp={vi.fn()} session={null} />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }))

    await waitFor(() => {
      expect(onRequestOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        name: '',
      })
    })

    expect(await screen.findByRole('textbox', { name: 'OTP code' })).toBeInTheDocument()
    expect(screen.getByText(/OTP sent successfully/i)).toBeInTheDocument()
  })

  it('submits OTP verification with the existing email context', async () => {
    const onRequestOtp = vi.fn().mockResolvedValue({ message: 'OTP sent successfully.' })
    const onVerifyOtp = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<LoginPage onRequestOtp={onRequestOtp} onVerifyOtp={onVerifyOtp} session={null} />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }))
    await screen.findByRole('textbox', { name: 'OTP code' })
    await user.type(screen.getByRole('textbox', { name: 'OTP code' }), '123456')

    fireEvent.click(screen.getByRole('button', { name: /Verify OTP and continue/i }))

    await waitFor(() => {
      expect(onVerifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: '123456',
      })
    })
  })

  it('shows API error feedback during OTP request failures', async () => {
    const onRequestOtp = vi.fn().mockRejectedValue(new Error('Mail transport failed.'))
    const user = userEvent.setup()

    render(<LoginPage onRequestOtp={onRequestOtp} onVerifyOtp={vi.fn()} session={null} />)

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }))

    expect(await screen.findByText(/Mail transport failed/i)).toBeInTheDocument()
  })
})
