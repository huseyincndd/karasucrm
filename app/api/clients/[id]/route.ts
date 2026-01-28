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
        }
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // usedQuota hesapla
    const usedQuota = {
      reels: client.tasks.filter(t => t.contentType === 'reels').length,
      posts: client.tasks.filter(t => t.contentType === 'posts').length,
      stories: client.tasks.filter(t => t.contentType === 'stories').length
    };

    return NextResponse.json({ 
      client: {
        ...client,
        startDate: client.startDate.toISOString().split('T')[0],
        renewalDate: client.renewalDate.toISOString().split('T')[0],
        usedQuota,
        tasks: client.tasks.map(t => ({
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
    const { name, logo, packageType, startDate, renewalDate } = body;

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

    const client = await prisma.client.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ 
      client: {
        ...client,
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
