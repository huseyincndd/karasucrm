import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/clients/[id] - Tek müşteri getir
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Oturum gerekli' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            contentType: true,
            date: true,
            status: true,
            assignedTo: true,
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { date: 'asc' }
        },
        // Sorumlu Kişilerin Bilgilerini Getir
        socialUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        designerUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        reelsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        adsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        // Hizmet Kayıtları
        services: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // usedQuota ve plannedDates hesapla
    const usedQuota = {
      reels: client.tasks.filter((t: any) => t.contentType === 'reels').length,
      posts: client.tasks.filter((t: any) => t.contentType === 'posts').length,
      stories: client.tasks.filter((t: any) => t.contentType === 'stories').length
    };

    const plannedDates: Record<string, string[]> = {
      reels: [],
      posts: [],
      stories: []
    };
    
    client.tasks.forEach((task: any) => {
      const dateStr = task.date.toISOString().split('T')[0];
      if (plannedDates[task.contentType]) {
        plannedDates[task.contentType].push(dateStr);
      }
    });

    return NextResponse.json({ 
      client: {
        ...client,
        password: undefined, // Şifreyi gönderme
        startDate: client.startDate.toISOString().split('T')[0],
        renewalDate: client.renewalDate.toISOString().split('T')[0],
        
        // Atama bilgileri zaten include ile geldi
        
        usedQuota,
        plannedDates,
        hasPortalAccess: !!(client.username && client.password),
        portalUsername: client.username || null,
        tasks: client.tasks.map((t: any) => ({
          ...t,
          date: t.date.toISOString().split('T')[0]
        }))
      }
    });
  } catch (error) {
    console.error('Client GET error:', error);
    return NextResponse.json(
      { error: 'Müşteri yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Müşteri güncelle (admin only)
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
      name, 
      logo, 
      packageType, 
      startDate, 
      renewalDate, 
      username, 
      password,
      socialUserId,
      designerUserId,
      reelsUserId,
      adsUserId,
      adsPeriod
    } = body;

    // Müşteri var mı kontrol
    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // Güncelleme verisi hazırla
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo || null;
    if (packageType) {
      const validPackages = ['vitrin', 'plus', 'premium'];
      if (!validPackages.includes(packageType)) {
        return NextResponse.json(
          { error: 'Geçersiz paket tipi' },
          { status: 400 }
        );
      }
      updateData.packageType = packageType;
    }
    if (startDate) updateData.startDate = new Date(startDate);
    if (renewalDate) updateData.renewalDate = new Date(renewalDate);
    
    // Yeni Atama Alanları
    if (socialUserId !== undefined) updateData.socialUserId = socialUserId || null;
    if (designerUserId !== undefined) updateData.designerUserId = designerUserId || null;
    if (reelsUserId !== undefined) updateData.reelsUserId = reelsUserId || null;
    if (adsUserId !== undefined) updateData.adsUserId = adsUserId || null;
    if (adsPeriod !== undefined) updateData.adsPeriod = adsPeriod || null;

    // Müşteri portalı giriş bilgileri
    if (username !== undefined) {
      const lowerUsername = username ? username.toLowerCase().trim() : null;
      
      if (lowerUsername) {
        // Username benzersiz mi kontrol et
        const existingClientWithUsername = await prisma.client.findUnique({ where: { username: lowerUsername } });
        if (existingClientWithUsername && existingClientWithUsername.id !== id) {
          return NextResponse.json(
            { error: 'Bu kullanıcı adı başka bir müşteri tarafından kullanılıyor' },
            { status: 400 }
          );
        }
        
        const existingUser = await prisma.user.findUnique({ where: { username: lowerUsername } });
        if (existingUser) {
          return NextResponse.json(
            { error: 'Bu kullanıcı adı bir ekip üyesi tarafından kullanılıyor' },
            { status: 400 }
          );
        }
      }
      updateData.username = lowerUsername;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Şifre en az 6 karakter olmalı' },
          { status: 400 }
        );
      }
      const bcrypt = (await import('bcryptjs')).default;
      updateData.password = await bcrypt.hash(password, 12);
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        socialUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        designerUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        reelsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        adsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } }
      }
    });

    return NextResponse.json({ 
      client: {
        ...client,
        password: undefined, // Şifreyi response'da gönderme
        startDate: client.startDate.toISOString().split('T')[0],
        renewalDate: client.renewalDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Client PUT error:', error);
    return NextResponse.json(
      { error: 'Müşteri güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - Müşteri sil (admin only)
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

    // Müşteri var mı kontrol
    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // Müşteriyi sil (cascade ile task'lar da silinir)
    await prisma.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client DELETE error:', error);
    return NextResponse.json(
      { error: 'Müşteri silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
