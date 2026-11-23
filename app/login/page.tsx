'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, Loader, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import '../auth.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!formData.password) errors.password = 'Password is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await login(formData.email, formData.password, formData.rememberMe);
      toast.success('Signed in successfully');
      router.push('/dashboard');
    } catch (err) {
      setIsSubmitting(false);
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const toggleRememberMe = () => {
    setFormData((prev) => ({ ...prev, rememberMe: !prev.rememberMe }));
  };

  return (
    <div className="auth-container">
      {/* LEFT VISUAL PANEL */}
      <div className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-content">
          <Link href="/" className="auth-back-visual">
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <div className="auth-visual-text">
            <Link href="/" className="auth-visual-logo-wrap">
              <Logo />
            </Link>
            <h2 className="auth-visual-tagline">
              Your crypto
              <br />
              <span>intelligence hub</span>
            </h2>
            <p className="auth-visual-desc">
              Sign in to access real-time market data, manage your portfolio, and track the assets
              that matter to you.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper auth-form-anim">
          {/* Mobile header */}
          <div className="auth-mobile-header">
            <Link href="/" className="auth-mobile-back" aria-label="Back to home">
              <ArrowLeft size={16} />
            </Link>
          </div>

          <div className="auth-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your Coinnex account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="login-form" noValidate>
            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`auth-input${formErrors.email ? ' input-error' : ''}`}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
              />
              {formErrors.email && <span className="auth-error-text">{formErrors.email}</span>}
            </div>

            <div className="auth-input-group">
              <div className="auth-label-row">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <Link href="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input${formErrors.password ? ' input-error' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {formErrors.password && (
                <span className="auth-error-text">{formErrors.password}</span>
              )}
            </div>

            <div className="auth-checkbox-row" onClick={toggleRememberMe}>
              <div className={`premium-checkbox ${formData.rememberMe ? 'checked' : ''}`}>
                {formData.rememberMe && <Check size={12} strokeWidth={3} />}
              </div>
              <label className="auth-checkbox-label">Remember me for 30 days</label>
            </div>

            {error && <div className="auth-server-error">{error}</div>}

            <button
              type="submit"
              id="login-submit-btn"
              className="auth-submit-btn"
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? (
                <>
                  <Loader size={18} className="auth-spin" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="auth-redirect">
              Don&apos;t have an account? <Link href="/register">Create account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
