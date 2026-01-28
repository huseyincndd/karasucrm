import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Tek kullanıcı getir (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Kullanıcı güncelle (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { username, password, name, role, department, isAdmin, avatar } = body;

    // Kullanıcı var mı kontrol
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Username değişiyorsa benzersizlik kontrolü
    if (username && username.toLowerCase() !== existingUser.username) {
      const userWithUsername = await prisma.user.findUnique({
        where: { username: username.toLowerCase() }
      });
      if (userWithUsername) {
        return NextResponse.json(
          { error: 'Bu kullanıcı adı zaten kullanılıyor' },
          { status: 409 }
        );
      }
    }

    // Güncelleme verisi hazırla
    const updateData: Record<string, unknown> = {};
    if (username) updateData.username = username.toLowerCase();
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (department) updateData.department = department;
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
    if (avatar !== undefined) updateData.avatar = avatar || null;
    
    // Şifre değişiyorsa hashle
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User PUT error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Kullanıcı sil (admin only)
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

    // Kullanıcı var mı kontrol
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    // Kendini silmeye çalışıyorsa engelle
    if (existingUser.id === admin.userId) {
      return NextResponse.json(
        { error: 'Kendinizi silemezsiniz' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User DELETE error:', error);
    return NextResponse.json(
      { error: 'Kullanıcı silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
