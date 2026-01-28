import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyAdmin } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tasks/[id] - Tek görev getir
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
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            logo: true,
            packageType: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            department: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      );
    }

    // Normal kullanıcı sadece kendi görevine erişebilir
    if (!user.isAdmin && task.assignedTo !== user.userId) {
      return NextResponse.json(
        { error: 'Bu göreve erişim yetkiniz yok' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      task: {
        id: task.id,
        title: task.title,
        contentType: task.contentType,
        date: task.date.toISOString().split('T')[0],
        status: task.status,
        clientId: task.clientId,
        clientName: task.client.name,
        clientLogo: task.client.logo,
        staffId: task.assignedTo,
        staffName: task.assignee.name,
        staffAvatar: task.assignee.avatar,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    console.error('Task GET error:', error);
    return NextResponse.json(
      { error: 'Görev yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Görev güncelle
// Admin: Her şeyi güncelleyebilir (assignee, date dahil)
// Normal user: Sadece status güncelleyebilir (kendi görevi için)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Oturum gerekli' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, contentType, date, status, clientId, assignedTo } = body;

    // Görev var mı kontrol
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      );
    }

    // Normal kullanıcı sadece kendi görevini güncelleyebilir
    if (!user.isAdmin && existingTask.assignedTo !== user.userId) {
      return NextResponse.json(
        { error: 'Bu görevi güncelleme yetkiniz yok' },
        { status: 403 }
      );
    }

    // Güncelleme verisi hazırla
    const updateData: Record<string, unknown> = {};

    // Status - herkes güncelleyebilir (kendi görevinde)
    if (status) {
      const validStatuses = ['beklemede', 'hazir', 'tamamlandi'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Geçersiz durum. Geçerli değerler: beklemede, hazir, tamamlandi' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Admin-only güncellemeler
    if (user.isAdmin) {
      if (title !== undefined) updateData.title = title || null;
      
      if (contentType) {
        const validContentTypes = ['reels', 'posts', 'stories'];
        if (!validContentTypes.includes(contentType)) {
          return NextResponse.json(
            { error: 'Geçersiz içerik tipi' },
            { status: 400 }
          );
        }
        updateData.contentType = contentType;
      }
      
      if (date) {
        updateData.date = new Date(date);
      }
      
      if (clientId) {
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) {
          return NextResponse.json(
            { error: 'Müşteri bulunamadı' },
            { status: 404 }
          );
        }
        updateData.clientId = clientId;
      }
      
      if (assignedTo) {
        const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
        if (!assignee) {
          return NextResponse.json(
            { error: 'Atanan kullanıcı bulunamadı' },
            { status: 404 }
          );
        }
        updateData.assignedTo = assignedTo;
      }
    } else {
      // Normal kullanıcı admin-only alanları değiştirmeye çalışıyorsa uyar
      if (assignedTo || date || clientId) {
        return NextResponse.json(
          { error: 'Bu alanları güncellemek için admin yetkisi gerekli' },
          { status: 403 }
        );
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    });

    return NextResponse.json({ 
      task: {
        id: task.id,
        title: task.title,
        contentType: task.contentType,
        date: task.date.toISOString().split('T')[0],
        status: task.status,
        clientId: task.clientId,
        clientName: task.client.name,
        clientLogo: task.client.logo,
        staffId: task.assignedTo,
        staffName: task.assignee.name,
        staffAvatar: task.assignee.avatar,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    console.error('Task PUT error:', error);
    return NextResponse.json(
      { error: 'Görev güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Görev sil (admin only)
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

    // Görev var mı kontrol
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Görev bulunamadı' },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json(
      { error: 'Görev silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
