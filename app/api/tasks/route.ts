import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// GET /api/tasks - Görevleri listele
// Admin: Tüm görevler (filtrelenebilir)
// Normal user: Sadece kendi görevleri
export async function GET(request: NextRequest) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Oturum gerekli' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // beklemede, hazir, tamamlandi
    const staffId = searchParams.get('staffId'); // Admin için filtreleme
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate'); // YYYY-MM-DD

    // Where koşulları oluştur
    const where: Record<string, unknown> = {};

    // Admin değilse sadece kendi görevleri
    if (!user.isAdmin) {
      where.assignedTo = user.userId;
    } else if (staffId) {
      // Admin için staff filtresi
      where.assignedTo = staffId;
    }

    // Status filtresi (comma-separated support)
    if (status) {
      const statuses = status.split(',').filter(s => ['beklemede', 'hazir', 'tamamlandi'].includes(s));
      if (statuses.length > 0) {
        where.status = { in: statuses };
      }
    }

    // Client filtresi
    if (clientId) {
      where.clientId = clientId;
    }

    // Tarih aralığı filtresi
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const tasks = await prisma.task.findMany({
      where,
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
      },
      orderBy: { date: 'asc' }
    });

    // Response formatı frontend'e uygun
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      contentType: task.contentType,
      date: task.date.toISOString().split('T')[0],
      status: task.status,
      clientId: task.clientId,
      clientName: task.client.name,
      clientLogo: task.client.logo,
      clientPackage: task.client.packageType,
      staffId: task.assignedTo,
      staffName: task.assignee.name,
      staffAvatar: task.assignee.avatar,
      staffRole: task.assignee.role,
      staffDepartment: task.assignee.department,
      createdAt: task.createdAt
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json(
      { error: 'Görevler yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Yeni görev ekle
// ClientPlanner'dan çağrılır (tarih + içerik tipi seçilince)
export async function POST(request: NextRequest) {
  const user = verifyAuth(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Oturum gerekli' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, contentType, date, clientId, assignedTo, status } = body;

    // Validasyon
    if (!contentType || !date || !clientId || !assignedTo) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: contentType, date, clientId, assignedTo' },
        { status: 400 }
      );
    }

    // Content type kontrolü
    const validContentTypes = ['reels', 'posts', 'stories'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Geçersiz içerik tipi. Geçerli değerler: reels, posts, stories' },
        { status: 400 }
      );
    }

    // Client var mı kontrol
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json(
        { error: 'Müşteri bulunamadı' },
        { status: 404 }
      );
    }

    // Assignee var mı kontrol
    const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
    if (!assignee) {
      return NextResponse.json(
        { error: 'Atanan kullanıcı bulunamadı' },
        { status: 404 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title: title || null,
        contentType,
        date: new Date(date),
        status: status || 'beklemede',
        clientId,
        assignedTo
      },
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
    }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json(
      { error: 'Görev oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
