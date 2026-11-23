'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft, Loader } from 'lucide-react';
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

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    clearError();
  }, [clearError]);
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const passwordStrength = getPasswordStrength(formData.password);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
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
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await register(formData.username, formData.email, formData.password);
      toast.success('Account created. Verify your email to continue.');
      router.push('/verify-otp');
    } catch (err) {
      setIsSubmitting(false);
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    }
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
              Join thousands of
              <br />
              <span>crypto traders</span>
            </h2>
            <p className="auth-visual-desc">
              Create your free account and get access to real-time market data, portfolio tracking,
              and personalised watchlists.
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
            <h1>Create account</h1>
            <p>Start your crypto intelligence journey with Coinnex.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="register-form" noValidate>
            <div className="auth-form-row">
              <div className="auth-input-group">
                <label htmlFor="username" className="auth-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={`auth-input${formErrors.username ? ' input-error' : ''}`}
                  placeholder="satoshi"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                />
                {formErrors.username && (
                  <span className="auth-error-text">{formErrors.username}</span>
                )}
              </div>

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
                />
                {formErrors.email && <span className="auth-error-text">{formErrors.email}</span>}
              </div>
            </div>

            <div className="auth-input-group">
              <label htmlFor="password" className="auth-label">
                Password
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
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide' : 'Show'}
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
                Confirm Password
              </label>
              <div className="auth-password-wrap">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-input${formErrors.confirmPassword ? ' input-error' : ''}`}
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide' : 'Show'}
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
              id="register-submit-btn"
              className="auth-submit-btn"
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? (
                <>
                  <Loader size={18} className="auth-spin" /> Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="auth-redirect">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
