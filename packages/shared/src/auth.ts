// ============================================================================
// SIMPLE JWT AUTHENTICATION HELPERS
// Used by Customer/Admin Service to create tokens and API Gateway to verify them.
// ============================================================================

import jwt from 'jsonwebtoken';
import { AuthTokenPayload, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-change-in-prod';

// 1. Create a signed JWT token when a user logs in
export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// 2. Verify and decode a JWT token
export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

// 3. Extract the token from "Authorization: Bearer <token>"
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// 4. Read the logged-in user from Gateway headers or Bearer token
export function resolveRequestUser(
  headers: Record<string, string | string[] | undefined>
): AuthTokenPayload | null {
  // If API Gateway already verified the token, it passes x-user-* headers
  const userId = headers['x-user-id'];
  if (typeof userId === 'string' && userId.length > 0) {
    return {
      userId,
      email: String(headers['x-user-email'] || 'customer@ecommerce.local'),
      role: (headers['x-user-role'] === 'admin' ? 'admin' : 'customer') as UserRole,
      fullName: String(headers['x-user-name'] || 'Customer'),
    };
  }

  // Otherwise check the Authorization header directly
  const authHeader = typeof headers['authorization'] === 'string' ? headers['authorization'] : undefined;
  const token = extractBearerToken(authHeader);
  if (!token) return null;

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
