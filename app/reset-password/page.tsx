'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import '../auth.css';

function getPasswordStrength(password: string) {
  let strength = 0;
  if (password.length > 5) strength++;
  if (password.length > 7) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, isLoading, error, clearError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    clearError();
    if (!token) {
      setTimeout(() => router.replace('/forgot-password'), 1500);
    }
  }, [clearError, token, router]);

  const passwordStrength = getPasswordStrength(formData.password);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!/^(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(formData.password)) {
      errors.password = 'Must be 8+ chars with 1 uppercase & 1 symbol';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasNavigated || !validate()) return;
    try {
      await resetPassword(token!, formData.password);
      setHasNavigated(true);
      toast.success('Password reset successfully');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed');
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
              Secure your
              <br />
              <span>account again</span>
            </h2>
            <p className="auth-visual-desc">
              Create a strong new password to protect your Coinnex account and keep your financial
              data safe.
            </p>
          </div>

          <div className="auth-visual-features">
            <div className="auth-visual-feature">
              <div className="auth-visual-feature-icon">
                <ShieldCheck size={14} />
              </div>
              Use 8+ characters with mixed case & symbols
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

          {success ? (
            <div className="auth-success-icon-wrap auth-form-anim">
              <div className="auth-success-icon">
                <ShieldCheck size={32} />
              </div>
              <p className="auth-success-title">Password reset!</p>
              <p className="auth-success-desc">
                Your password has been updated. Redirecting you to sign in...
              </p>
              <div
                className="auth-submit-btn"
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '0.5rem',
                  cursor: 'default',
                }}
              >
                <Loader size={18} className="auth-spin" /> Redirecting...
              </div>
            </div>
          ) : (
            <>
              <div className="auth-form-header">
                <h1>Reset password</h1>
                <p>Create a new strong password for your account.</p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="auth-form"
                id="reset-password-form"
                noValidate
              >
                <div className="auth-input-group">
                  <label htmlFor="password" className="auth-label">
                    New Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`auth-input${formErrors.password ? ' input-error' : ''}`}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="auth-strength-bar-wrap">
                      <div className={`auth-strength-bar level-${passwordStrength}`} />
                    </div>
                  )}
                  {formErrors.password && (
                    <span className="auth-error-text">{formErrors.password}</span>
                  )}
                </div>

                <div className="auth-input-group">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm New Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      className={`auth-input${formErrors.confirmPassword ? ' input-error' : ''}`}
                      placeholder="Repeat your new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <span className="auth-error-text">{formErrors.confirmPassword}</span>
                  )}
                </div>

                {error && <div className="auth-server-error">{error}</div>}

                <button
                  type="submit"
                  id="reset-submit-btn"
                  className="auth-submit-btn"
                  disabled={isLoading || hasNavigated}
                >
                  {isLoading ? (
                    <>
                      <Loader size={18} className="auth-spin" /> Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
