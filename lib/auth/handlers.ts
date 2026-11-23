import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/lib/models/User';
import {
  clearAuthCookie,
  getAuthToken,
  getAuthUser,
  setAuthCookie,
  toPublicUser,
  verifyAuthToken,
} from '@/lib/auth/session';
import {
  sendPasswordResetEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from '@/lib/auth/email';

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
const VERIFICATION_TOKEN_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type RegisterBody = {
  username: string;
  email: string;
  password: string;
};

type LoginBody = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type VerifyEmailBody = {
  email: string;
  code: string;
};

type ForgotPasswordBody = {
  email: string;
};

type ResetPasswordBody = {
  token: string;
  password: string;
};

type UpdateProfileBody = {
  username?: string;
  avatar?: string;
  phone?: string;
  phoneNumber?: string;
  birthday?: string;
  gender?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

async function readBody<T>(request: NextRequest) {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {} as Partial<T>;
  }
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? '';
}

function isDevResponse() {
  return process.env.NODE_ENV !== 'production';
}

function getAppUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    `${request.nextUrl.protocol}//${request.headers.get('host')}`
  );
}

function generateVerificationToken() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function register(request: NextRequest) {
  try {
    const body = await readBody<RegisterBody>(request);
    const { username, password } = body;
    const email = normalizeEmail(body.email);

    if (!username?.trim() || !email || !password) {
      return jsonError('All fields are required');
    }

    if (!PASSWORD_PATTERN.test(password)) {
      return jsonError('Password must be 8+ chars with 1 uppercase and 1 symbol');
    }

    await connectDB();

    const userAlreadyExists = await User.findOne({ email });
    if (userAlreadyExists) {
      return jsonError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    const user = await User.create({
      username: username.trim(),
      name: username.trim(),
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpiresAt,
    });

    const delivery = await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please verify your email.',
        user: toPublicUser(user),
        ...(delivery.devOnly && isDevResponse() ? { devVerificationToken: verificationToken } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error in register handler:', error);
    return jsonError('Registration failed', 500);
  }
}

export async function verifyEmail(request: NextRequest) {
  try {
    const body = await readBody<VerifyEmailBody>(request);
    const email = normalizeEmail(body.email);
    const code = body.code?.trim();

    if (!email || !code) {
      return jsonError('Email and verification code are required');
    }

    await connectDB();

    const user = await User.findOne({
      email,
      verificationToken: code,
      verificationTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return jsonError('Invalid or expired verification code');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    user.lastLogin = new Date();
    user.revokedAt = null;
    await user.save({ validateBeforeSave: false });

    await sendWelcomeEmail(user.email, user.username);

    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: toPublicUser(user),
    });
    setAuthCookie(response, user._id.toString());

    return response;
  } catch (error) {
    console.error('Error in verifyEmail handler:', error);
    return jsonError('Email verification failed', 500);
  }
}

export async function resendVerification(request: NextRequest) {
  try {
    const body = await readBody<ForgotPasswordBody>(request);
    const email = normalizeEmail(body.email);

    if (!email) {
      return jsonError('Email is required');
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return jsonError('User not found', 404);
    }

    if (user.isVerified) {
      return jsonError('Email already verified');
    }

    const verificationToken = generateVerificationToken();
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const delivery = await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully',
      ...(delivery.devOnly && isDevResponse() ? { devVerificationToken: verificationToken } : {}),
    });
  } catch (error) {
    console.error('Error in resendVerification handler:', error);
    return jsonError('Failed to resend verification code', 500);
  }
}

export async function login(request: NextRequest) {
  try {
    const body = await readBody<LoginBody>(request);
    const email = normalizeEmail(body.email);

    if (!email || !body.password) {
      return jsonError('All fields are required');
    }

    await connectDB();

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return jsonError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return jsonError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before signing in',
          requiresVerification: true,
        },
        { status: 403 },
      );
    }

    user.lastLogin = new Date();
    user.rememberMe = Boolean(body.rememberMe);
    user.revokedAt = null;
    await user.save({ validateBeforeSave: false });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: toPublicUser(user),
    });
    setAuthCookie(response, user._id.toString(), user.rememberMe);

    return response;
  } catch (error) {
    console.error('Error in login handler:', error);
    return jsonError('Login failed', 500);
  }
}

export async function logout(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (token) {
      try {
        const decoded = verifyAuthToken(token);
        await connectDB();
        await User.findByIdAndUpdate(decoded.userId, { revokedAt: new Date() });
      } catch {
        // Clearing the cookie is still useful even when the token is invalid.
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    clearAuthCookie(response);

    return response;
  } catch (error) {
    console.error('Error in logout handler:', error);
    return jsonError('Logout failed', 500);
  }
}

export async function forgotPassword(request: NextRequest) {
  try {
    const body = await readBody<ForgotPasswordBody>(request);
    const email = normalizeEmail(body.email);

    if (!email) {
      return jsonError('Email is required');
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return jsonError('No account found with that email address', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${getAppUrl(request)}/reset-password?token=${resetToken}`;
    const delivery = await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email',
      ...(delivery.devOnly && isDevResponse() ? { devResetUrl: resetUrl } : {}),
    });
  } catch (error) {
    console.error('Error in forgotPassword handler:', error);
    return jsonError('Failed to send reset link', 500);
  }
}

export async function resetPassword(request: NextRequest) {
  try {
    const body = await readBody<ResetPasswordBody>(request);

    if (!body.token || !body.password) {
      return jsonError('Reset token and password are required');
    }

    if (!PASSWORD_PATTERN.test(body.password)) {
      return jsonError('Password must be 8+ chars with 1 uppercase and 1 symbol');
    }

    const hashedToken = crypto.createHash('sha256').update(body.token).digest('hex');

    await connectDB();

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return jsonError('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    await sendResetSuccessEmail(user.email);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Error in resetPassword handler:', error);
    return jsonError('Password reset failed', 500);
  }
}

export async function checkAuth(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    return NextResponse.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Error in checkAuth handler:', error);
    return jsonError('Authentication check failed', 401);
  }
}

export async function getProfile(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    return NextResponse.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Error in getProfile handler:', error);
    return jsonError('Failed to load profile', 500);
  }
}

export async function updateProfile(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return jsonError('Unauthorized', 401);
    }

    const body = await readBody<UpdateProfileBody>(request);

    const updates: Record<string, string | Date | null> = {};
    if (body.username?.trim()) {
      updates.username = body.username.trim();
      updates.name = body.username.trim();
    }
    if (typeof body.avatar === 'string') updates.avatar = body.avatar;
    if (typeof body.phone === 'string') updates.phone = body.phone.trim();
    if (typeof body.phoneNumber === 'string') updates.phone = body.phoneNumber.trim();

    if (typeof body.birthday === 'string') {
      if (!body.birthday) {
        updates.birthday = null;
      } else {
        const birthday = new Date(`${body.birthday}T00:00:00.000Z`);
        if (Number.isNaN(birthday.getTime())) {
          return jsonError('Invalid birthday');
        }
        updates.birthday = birthday;
      }
    }

    if (typeof body.gender === 'string') {
      if (!['Male', 'Female', ''].includes(body.gender)) {
        return jsonError('Invalid gender');
      }
      updates.gender = body.gender;
    }

    const user = await User.findByIdAndUpdate(authUser._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return jsonError('User not found', 404);
    }

    return NextResponse.json({
      success: true,
      user: toPublicUser(user),
    });
  } catch (error) {
    console.error('Error in updateProfile handler:', error);
    return jsonError('Failed to update profile', 500);
  }
}
