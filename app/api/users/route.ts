import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/users - Tüm kullanıcıları listele (admin only)
export async function GET(request: NextRequest) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        // password hariç
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json(
      { error: 'Kullanıcılar yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST /api/users - Yeni kullanıcı ekle (admin only)
export async function POST(request: NextRequest) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { username, password, name, role, department, isAdmin, avatar } = body;

    // Validasyon
    if (!username || !password || !name || !role || !department) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: username, password, name, role, department' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalı' },
        { status: 400 }
      );
    }

    // Username benzersiz mi kontrol
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 409 }
      );
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role,
        department,
        avatar: avatar || null,
        isAdmin: isAdmin || false
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        avatar: true,
        isAdmin: true,
        createdAt: true
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
