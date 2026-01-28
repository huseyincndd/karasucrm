import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  username: string;
  name: string;
  isAdmin: boolean;
  department: string;
}

/**
 * Request'ten JWT token'ı doğrular ve kullanıcı bilgisini döner
 * Token geçersizse null döner
 */
export function verifyAuth(request: NextRequest): JWTPayload | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Admin yetkisi kontrolü
 * Token geçersiz veya admin değilse false döner
 */
export function verifyAdmin(request: NextRequest): JWTPayload | null {
  const user = verifyAuth(request);
  
  if (!user || !user.isAdmin) {
    return null;
  }

  return user;
}
