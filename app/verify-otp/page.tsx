'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import '../auth.css';

export default function VerifyOTPPage() {
  const router = useRouter();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasVerified = useRef(false);

  useEffect(() => {
    clearError();
    try {
      const stored = localStorage.getItem('coinpulse_pending');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPendingEmail(parsed.email || '');
      } else {
        router.replace('/register');
      }
    } catch {
      router.replace('/register');
    }
  }, [clearError, router]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0 && !canResend) {
      const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(id);
    } else {
      setCanResend(true);
    }
  }, [resendTimer, canResend]);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newCode = [...code];
    if (value.length > 1) {
      // paste handling
      const chars = value.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) newCode[index + i] = c;
      });
      setCode(newCode);
      const next = Math.min(index + chars.length, 5);
      inputRefs.current[next]?.focus();
    } else {
      newCode[index] = value;
      setCode(newCode);
      if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (index: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const newCode = [...code];
    digits.forEach((c, i) => {
      if (index + i < 6) newCode[index + i] = c;
    });
    setCode(newCode);
    const next = Math.min(index + digits.length, 5);
    inputRefs.current[next]?.focus();
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (hasVerified.current) return;
      const full = code.join('');
      if (full.length !== 6) return;
      try {
        setIsSubmitting(true);
        await verifyOtp(pendingEmail, full);
        hasVerified.current = true;
        toast.success('Email verified successfully');
        router.push('/dashboard');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Verification failed');
        setIsSubmitting(false);
      }
    },
    [code, pendingEmail, verifyOtp, router],
  );

  // Auto-submit when all 6 filled
  useEffect(() => {
    if (code.every((d) => d !== '') && !hasVerified.current) {
      handleSubmit();
    }
  }, [code, handleSubmit]);

  const handleResend = async () => {
    if (!canResend || isResending) return;
    try {
      setIsResending(true);
      await resendOtp(pendingEmail);
      setCanResend(false);
      setResendTimer(60);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT VISUAL PANEL */}
      <div className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <Link href="/register" className="auth-back-visual">
            <ArrowLeft size={16} /> Back to Register
          </Link>

          <div className="auth-visual-text">
            <Link href="/" className="auth-visual-logo-wrap">
              <Logo />
            </Link>
            <h2 className="auth-visual-tagline">
              Verify it&apos;s
              <br />
              <span>really you</span>
            </h2>
            <p className="auth-visual-desc">
              We sent a 6-digit code to your email to confirm your identity. It only takes a second.
            </p>
          </div>

          <div className="auth-visual-features">
            <div className="auth-visual-feature">
              <div className="auth-visual-feature-icon">
                <ShieldCheck size={14} />
              </div>
              One-time code valid for 10 minutes
            </div>
          </div>

          <div className="auth-visual-footer">Copyright 2025 Coinnex. All rights reserved.</div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper auth-form-anim">
          <div className="auth-mobile-header">
            <Link href="/register" className="auth-mobile-back" aria-label="Back to register">
              <ArrowLeft size={16} />
            </Link>
          </div>

          <div className="auth-form-header">
            <h1>Verify your email</h1>
            <p>
              We&apos;ve sent a 6-digit code to{' '}
              {pendingEmail && <strong style={{ color: 'white' }}>{pendingEmail}</strong>}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="verify-otp-form">
            <div className="auth-otp-inputs">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  className={`auth-otp-input${digit ? ' filled' : ''}`}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={(e) => handlePaste(i, e)}
                  aria-label={`OTP digit ${i + 1}`}
                  id={`otp-input-${i}`}
                />
              ))}
            </div>

            {error && <div className="auth-server-error">{error}</div>}

            <button
              type="submit"
              id="verify-otp-btn"
              className="auth-submit-btn"
              disabled={isLoading || isResending || isSubmitting || code.some((d) => !d)}
            >
              {(isLoading || isSubmitting) && !isResending ? (
                <>
                  <Loader size={18} className="auth-spin" /> Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </button>

            <div className="auth-resend">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                className="auth-resend-btn"
                onClick={handleResend}
                disabled={!canResend || isLoading || isResending}
              >
                {isResending
                  ? 'Resending...'
                  : canResend
                    ? 'Resend Code'
                    : `Resend in ${resendTimer}s`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
