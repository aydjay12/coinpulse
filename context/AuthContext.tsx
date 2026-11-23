'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  birthday?: string;
  gender?: 'Male' | 'Female' | '';
  isVerified: boolean;
  role?: 'user' | 'admin';
}

export type ProfileUpdateInput = {
  username?: string;
  phone?: string;
  phoneNumber?: string;
  birthday?: string;
  gender?: 'Male' | 'Female' | '';
  avatar?: string;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  updateProfile: (profile: ProfileUpdateInput) => Promise<User>;
  clearError: () => void;
}

type AuthApiResponse = {
  success: boolean;
  message?: string;
  user?: User;
  devVerificationToken?: string;
  devResetUrl?: string;
  requiresVerification?: boolean;
};

class AuthApiError extends Error {
  data?: AuthApiResponse;

  constructor(message: string, data?: AuthApiResponse) {
    super(message);
    this.name = 'AuthApiError';
    this.data = data;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const STORAGE_KEY = 'coinpulse_user';
const PENDING_KEY = 'coinpulse_pending';

async function authRequest<T extends AuthApiResponse>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 15_000,
) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`/api/auth${path}`, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({
      success: response.ok,
    }))) as T;

    if (!response.ok || data.success === false) {
      throw new AuthApiError(data.message || 'Authentication request failed', data);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AuthApiError('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        const data = await authRequest<AuthApiResponse>('/check-auth');
        if (!isActive) return;

        if (data.user) {
          setUser(data.user);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        }
      } catch {
        if (!isActive) return;
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authRequest<AuthApiResponse>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!data.user) {
        throw new Error('Login failed');
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
    } catch (err) {
      if (err instanceof AuthApiError && err.data?.requiresVerification) {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ email }));
      }

      const message = getErrorMessage(err, 'Login failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authRequest<AuthApiResponse>('/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });

      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          username,
          email,
          devVerificationToken: data.devVerificationToken,
        }),
      );
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Attempt server logout with a shorter timeout
      await authRequest<AuthApiResponse>('/logout', { method: 'POST' }, 3_000);
    } catch (err) {
      console.warn('Server-side logout background request failed or timed out:', err);
      // We explicitly DO NOT throw here because the user's local session
      // is always cleared below, ensuring they can always "log out"
      // even with no internet connection.
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PENDING_KEY);
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authRequest<AuthApiResponse>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to send reset link');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await authRequest<AuthApiResponse>('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
    } catch (err) {
      const message = getErrorMessage(err, 'Password reset failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authRequest<AuthApiResponse>('/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });

      if (!data.user) {
        throw new Error('Verification failed');
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      localStorage.removeItem(PENDING_KEY);
    } catch (err) {
      const message = getErrorMessage(err, 'Verification failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authRequest<AuthApiResponse>('/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (data.devVerificationToken) {
        const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
        localStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ ...pending, email, devVerificationToken: data.devVerificationToken }),
        );
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to resend verification code');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profile: ProfileUpdateInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authRequest<AuthApiResponse>('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });

      if (!data.user) {
        throw new Error('Profile update failed');
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      const message = getErrorMessage(err, 'Profile update failed');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        verifyOtp,
        resendOtp,
        updateProfile,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
