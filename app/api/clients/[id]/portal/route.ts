import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/clients/[id]/portal - Müşteri portalı giriş bilgilerini ayarla
export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const { username, password } = await request.json();

    // Validasyon
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalı' },
        { status: 400 }
      );
    }

    const lowerUsername = username.toLowerCase().trim();

    // Müşteri var mı kontrol
    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // Username benzersiz mi? (hem Client hem User tablosunda kontrol)
    const clientWithSameUsername = await prisma.client.findUnique({ where: { username: lowerUsername } });
    if (clientWithSameUsername && clientWithSameUsername.id !== id) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı başka bir müşteri tarafından kullanılıyor' },
        { status: 400 }
      );
    }

    const userWithSameUsername = await prisma.user.findUnique({ where: { username: lowerUsername } });
    if (userWithSameUsername) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı bir ekip üyesi tarafından kullanılıyor' },
        { status: 400 }
      );
    }

    // Şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.client.update({
      where: { id },
      data: {
        username: lowerUsername,
        password: hashedPassword
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Portal giriş bilgileri başarıyla ayarlandı'
    });
  } catch (error) {
    console.error('Portal setup error:', error);
    return NextResponse.json(
      { error: 'Portal ayarlanırken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]/portal - Müşteri portal erişimini kaldır
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    await prisma.client.update({
      where: { id },
      data: {
        username: null,
        password: null
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Portal erişimi kaldırıldı'
    });
  } catch (error) {
    console.error('Portal delete error:', error);
    return NextResponse.json(
      { error: 'Portal erişimi kaldırılırken hata oluştu' },
      { status: 500 }
    );
  }
}
