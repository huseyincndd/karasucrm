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
    const { 
      username, 
      password, 
      name, 
      roleTitle, 
      baseSalary, 
      isAdmin, 
      avatar,
      capabilities // Array of { type, price }
    } = body;

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

    // Transaction ile güncelleme (User + Capabilities)
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. User Update Data Hazırla
      const updateData: any = {};
      if (username) updateData.username = username.toLowerCase();
      if (name) updateData.name = name;
      if (roleTitle) updateData.roleTitle = roleTitle;
      if (baseSalary !== undefined) updateData.baseSalary = parseFloat(baseSalary);
      if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
      if (avatar !== undefined) updateData.avatar = avatar || null;
      
      // Şifre değişiyorsa hashle
      if (password && password.length >= 6) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      // 2. User'ı güncelle
      const user = await tx.user.update({
        where: { id },
        data: updateData
      });

      // 3. Capabilities Güncelleme (Sil ve Yeniden Ekle) mantığı
      if (Array.isArray(capabilities)) {
        // Önce eskileri sil
        await tx.userCapability.deleteMany({
          where: { userId: id }
        });

        // Yenileri ekle
        if (capabilities.length > 0) {
          await tx.userCapability.createMany({
            data: capabilities.map((c: any) => ({
              userId: id,
              type: c.type,
              price: parseFloat(c.price)
            }))
          });
        }
      }

      // 4. Güncel veriyi dön
      return tx.user.findUnique({
        where: { id },
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
        }
      });
    });

    return NextResponse.json({ user: updatedUser });
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
