import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validasyon
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      );
    }

    const lowerUsername = username.toLowerCase();

    // 1. Önce User tablosunda ara (ekip üyeleri)
    const user = await prisma.user.findUnique({
      where: { username: lowerUsername }
    });

    if (user) {
      // Şifre kontrolü
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Kullanıcı adı veya şifre hatalı' },
          { status: 401 }
        );
      }

      // JWT token oluştur (ekip üyesi)
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          name: user.name,
          isAdmin: user.isAdmin,
          department: '',
          isClient: false
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Response oluştur
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          roleTitle: user.roleTitle,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
          isClient: false
        }
      });

      // Cookie'ye token yaz
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/'
      });

      return response;
    }

    // 2. User bulunamadı, Client tablosunda ara (müşteri portalı)
    const client = await prisma.client.findUnique({
      where: { username: lowerUsername }
    });

    if (client && client.password) {
      // Şifre kontrolü
      const isValidPassword = await bcrypt.compare(password, client.password);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Kullanıcı adı veya şifre hatalı' },
          { status: 401 }
        );
      }

      // JWT token oluştur (müşteri)
      const token = jwt.sign(
        {
          userId: client.id,
          username: client.username,
          name: client.name,
          isAdmin: false,
          department: '',
          isClient: true,
          clientId: client.id
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Response oluştur
      const response = NextResponse.json({
        success: true,
        user: {
          id: client.id,
          username: client.username,
          name: client.name,
          role: 'Müşteri',
          department: '',
          avatar: client.logo,
          isAdmin: false,
          isClient: true,
          clientId: client.id
        }
      });

      // Cookie'ye token yaz
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/'
      });

      return response;
    }

    // Hiçbir tabloda bulunamadı
    return NextResponse.json(
      { error: 'Kullanıcı adı veya şifre hatalı' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
