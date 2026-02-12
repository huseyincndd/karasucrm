import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { TASK_PRICES, getSalaryPeriod, isDateInSalaryPeriod } from '@/constants/wallet';

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
            roleTitle: true
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
        staffRole: task.assignee.roleTitle, // Updated
        staffDepartment: task.assignee.roleTitle, // Legacy support
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

      // Cüzdan İşlemleri (Yetenek Bazlı Fiyatlandırma)
      const currentPeriod = getSalaryPeriod(new Date());
      const taskDate = new Date(existingTask.date);
      
      // Sadece şimdiki veya gelecekteki maaş dönemi için işlem yap (Eski görevler cüzdanı etkilemez)
      if (isDateInSalaryPeriod(taskDate, currentPeriod)) {
        
        // 1. Durum "Tamamlandı" olduysa -> Cüzdana Ekle
        if (status === 'tamamlandi' && existingTask.status !== 'tamamlandi') {
          // Görevi yapan kişiyi ve yeteneklerini çek
          const assignee = await prisma.user.findUnique({
            where: { id: existingTask.assignedTo },
            include: { capabilities: true }
          });

          if (assignee) {
            // İlgili yeteneği bul (örn: 'reels' -> 'reels')
            // ContentType mapping gerekebilir: 'posts' -> 'post', 'stories' -> 'social_management' veya direkt mapping
            let capabilityType = existingTask.contentType;
            if (capabilityType === 'posts') capabilityType = 'post';
            // Story için özel bir yetenek yoksa genel sosyal medya yönetimi veya post fiyatı baz alınabilir mi?
            // Şimdilik 'stories' -> 'post' veya 'social_management' varsayalım. 
            // Veya content type users'da nasıl tutuluyorsa öyle.
            // Veritabanında capability tipleri: 'reels', 'post', 'social_management', 'ad_management'
            
            if (capabilityType === 'stories') capabilityType = 'post'; // Story için post fiyatını baz al (veya mantığı değiştirin)

            const capability = assignee.capabilities.find(c => c.type === capabilityType);
            const price = capability ? capability.price : 0;

            if (price > 0) {
              const taskWithClient = await prisma.task.findUnique({
                where: { id },
                include: { client: { select: { name: true } } }
              });

               // Daha önce işlem yoksa oluştur
               const existingTransaction = await prisma.walletTransaction.findUnique({
                where: { taskId: id }
              });

              if (!existingTransaction) {
                const contentLabel = existingTask.contentType === 'reels' ? 'Reels' 
                  : existingTask.contentType === 'posts' ? 'Post' : 'Story';
                  
                await prisma.walletTransaction.create({
                  data: {
                    amount: price,
                    contentType: existingTask.contentType,
                    description: `${taskWithClient?.client.name || 'Müşteri'} - ${contentLabel}`,
                    userId: existingTask.assignedTo,
                    taskId: id,
                  }
                });
              }
            }
          }
        }
        // 2. Durum "Tamamlandı"dan çıktıysa -> Cüzdandan Sil
        else if (status !== 'tamamlandi' && existingTask.status === 'tamamlandi') {
          await prisma.walletTransaction.deleteMany({
            where: { taskId: id }
          });
        }
      }
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
