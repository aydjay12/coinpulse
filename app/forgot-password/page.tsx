'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import '../auth.css';

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email address');
      return;
    }
    setEmailError('');
    try {
      await forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent. Check your inbox.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset link');
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT VISUAL PANEL */}
      <div className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <Link href="/login" className="auth-back-visual">
            <ArrowLeft size={16} /> Back to Sign In
          </Link>

          <div className="auth-visual-text">
            <Link href="/" className="auth-visual-logo-wrap">
              <Logo />
            </Link>
            <h2 className="auth-visual-tagline">
              Recover your
              <br />
              <span>account access</span>
            </h2>
            <p className="auth-visual-desc">
              Lost your password? No worries - we&apos;ll send you a secure link to reset it and get
              you back on track.
            </p>
          </div>

          <div className="auth-visual-features">
            <div className="auth-visual-feature">
              <div className="auth-visual-feature-icon">
                <Mail size={14} />
              </div>
              Reset link sent to your email
            </div>
            <div className="auth-visual-feature">
              <div className="auth-visual-feature-icon">
                <CheckCircle size={14} />
              </div>
              Secure, time-limited reset token
            </div>
          </div>

          <div className="auth-visual-footer">Copyright 2025 Coinnex. All rights reserved.</div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper auth-form-anim">
          <div className="auth-mobile-header">
            <Link href="/login" className="auth-mobile-back" aria-label="Back to sign in">
              <ArrowLeft size={16} />
            </Link>
          </div>

          <div className="auth-form-header">
            <h1>Forgot password</h1>
            <p>
              {submitted
                ? 'Check your inbox for the reset link.'
                : "Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="auth-form"
              id="forgot-password-form"
              noValidate
            >
              <div className="auth-input-group">
                <label htmlFor="email" className="auth-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`auth-input${emailError ? ' input-error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  autoComplete="email"
                  autoFocus
                />
                {emailError && <span className="auth-error-text">{emailError}</span>}
              </div>

              {error && <div className="auth-server-error">{error}</div>}

              <button
                type="submit"
                id="forgot-submit-btn"
                className="auth-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader size={18} className="auth-spin" /> Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <p className="auth-redirect">
                Remember your password? <Link href="/login">Sign in</Link>
              </p>
            </form>
          ) : (
            <div className="auth-success-icon-wrap auth-form-anim" style={{ marginTop: '1rem' }}>
              <div className="auth-success-icon">
                <CheckCircle size={32} />
              </div>
              <p className="auth-success-title">Reset link sent!</p>
              <p className="auth-success-desc">
                If an account exists for <strong style={{ color: 'white' }}>{email}</strong>, you
                will receive a password reset link shortly. Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="auth-submit-btn"
                style={{
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                Return to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
