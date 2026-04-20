import { useState } from 'react'

import LoadingDots from '../components/LoadingDots'
import { loginBenefits } from '../data/siteContent'

export default function LoginPage({ onRequestOtp, onVerifyOtp, session }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    code: '',
  })
  const [feedback, setFeedback] = useState('')
  const [step, setStep] = useState('request')
  const [loading, setLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleRequestOtp(event) {
    event.preventDefault()

    if (!form.email.trim()) {
      setFeedback('Add an email address to continue.')
      return
    }

    setLoading(true)

    try {
      const result = await onRequestOtp({
        email: form.email,
        name: form.name,
      })
      setStep('verify')
      setFeedback(result.message || 'OTP sent. Check your inbox.')
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault()

    if (!form.code.trim()) {
      setFeedback('Enter the 6-digit OTP from your email inbox.')
      return
    }

    setLoading(true)

    try {
      await onVerifyOtp({
        email: form.email,
        code: form.code,
      })
    } catch (error) {
      setFeedback(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return (
      <section className="auth-layout">
        <div className="panel auth-panel auth-panel--wide">
          <span className="eyebrow">You are already signed in</span>
          <h1>{session.user.profile?.displayName || 'Your account'} is ready.</h1>
          <p>
            Your OTP session is active. Head into the reading feed, open your
            profile, or publish if the admin has already granted author access.
          </p>
          <div className="hero__actions">
            <a
              className="button button--primary"
              href={session.user.canWrite ? '#/create' : '#/profile/me'}
            >
              {session.user.canWrite ? 'Create article' : 'View profile'}
            </a>
            <a className="button button--secondary" href="#/articles">
              Read articles
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-layout">
      <div className="panel auth-panel auth-panel--feature">
        <span className="eyebrow">OTP authentication</span>
        <h1>Explore, Learn, and Build in the world of Tech & AI</h1>
        <p>
          Sign in to access a curated platform of insightful articles and practical knowledge across multiple domains. Stay updated with the latest ideas, engage with meaningful content, and contribute your own voice to a growing community of developers and innovators.
        </p>

        <div className="auth-benefits">
          {loginBenefits.map((benefit) => (
            <div key={benefit} className="auth-benefit">
              <span className="auth-benefit__bullet" />
              <p>{benefit}</p>
            </div>
          ))}
        </div>
      </div>

      <form
        className="panel auth-panel auth-form"
        onSubmit={step === 'request' ? handleRequestOtp : handleVerifyOtp}
      >
        <span className="eyebrow">Welcome back</span>
        <h2>Sign in to InnoBlog</h2>

        <label className="field">
          <span>Name</span>
          <input
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
          />
        </label>

        {step === 'verify' ? (
          <label className="field">
            <span>OTP code</span>
            <input
              name="code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={form.code}
              onChange={handleChange}
            />
          </label>
        ) : null}

        {feedback ? <p className="form-message form-message--error">{feedback}</p> : null}

        <button className="button button--primary button--full" type="submit">
          {loading ? (
            <span>
              <LoadingDots />
            </span>
          ) : step === 'request' ? (
            'Send OTP'
          ) : (
            'Verify OTP and continue'
          )}
        </button>

        <p className="fine-print">
          Readers can sign in and interact with published work. Only authors and
          admins can access the publishing studio.
        </p>
      </form>
    </section>
  )
}
