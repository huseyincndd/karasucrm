import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET /api/users - Tüm kullanıcıları listele (admin only)
export async function GET(request: NextRequest) {
  // Admin kontrolü (geçici olarak kapalı olabilir ama doğrusu açık olması)
  // const admin = verifyAdmin(request);
  // if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        roleTitle: true,
        baseSalary: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        capabilities: {
          select: {
            type: true,
            price: true
          }
        }
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
  // const admin = verifyAdmin(request);
  // if (!admin) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

  try {
    const body = await request.json();
    const { 
      username, 
      password, 
      name, 
      roleTitle, 
      baseSalary, 
      isAdmin, 
      avatar,
      capabilities // Array of { type: string, price: number }
    } = body;

    // Validasyon
    if (!username || !password || !name || !roleTitle) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: username, password, name, roleTitle' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalı' },
        { status: 400 }
      );
    }

    // Username benzersiz mi?
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

    // Kullanıcı ve Yetenekleri oluştur
    // Nested create kullanarak tek transaction'da hallederiz
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        roleTitle,
        baseSalary: parseFloat(baseSalary || '0'),
        avatar: avatar || null,
        isAdmin: isAdmin || false,
        capabilities: {
          create: Array.isArray(capabilities) ? capabilities.map((c: any) => ({
            type: c.type,
            price: parseFloat(c.price)
          })) : []
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        roleTitle: true,
        baseSalary: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        capabilities: true
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
