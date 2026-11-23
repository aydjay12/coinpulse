import jwt, { JwtPayload } from 'jsonwebtoken';
import type { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User, { UserDocument } from '@/lib/models/User';

export const AUTH_COOKIE_NAME = 'coinpulse_auth_token';

const ONE_DAY_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * ONE_DAY_SECONDS;

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  phone?: string;
  birthday?: string;
  gender?: 'Male' | 'Female' | '';
  isVerified: boolean;
  role: 'user' | 'admin';
};

type AuthJwtPayload = JwtPayload & {
  userId: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    avatar: user.avatar || user.image || undefined,
    phone: user.phone || '',
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : '',
    gender: user.gender || '',
    isVerified: Boolean(user.isVerified),
    role: user.role,
  };
}

export function signAuthToken(userId: string, rememberMe = false) {
  const maxAge = rememberMe ? THIRTY_DAYS_SECONDS : ONE_DAY_SECONDS;
  const token = jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: maxAge,
  });

  return { token, maxAge };
}

export function setAuthCookie(response: NextResponse, userId: string, rememberMe = false) {
  const { token, maxAge } = signAuthToken(userId, rememberMe);

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  return token;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function getAuthToken(request: NextRequest) {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return null;
}

export function verifyAuthToken(token: string): AuthJwtPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === 'string' || !decoded || typeof decoded.userId !== 'string') {
    throw new Error('Invalid auth token');
  }

  return decoded as AuthJwtPayload;
}

export async function getAuthUser(request: NextRequest) {
  const token = getAuthToken(request);
  if (!token) return null;

  const decoded = verifyAuthToken(token);
  await connectDB();

  const user = await User.findById(decoded.userId);
  if (!user) return null;

  if (user.revokedAt && decoded.iat && decoded.iat * 1000 < user.revokedAt.getTime()) {
    return null;
  }

  return user;
}
