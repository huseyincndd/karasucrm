import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, verifyAdmin } from '@/lib/auth';

// GET /api/clients - Tüm müşterileri listele (Sadece Admin)
export async function GET(request: NextRequest) {
  const user = verifyAdmin(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const clients = await prisma.client.findMany({
      include: {
        tasks: {
          select: {
            id: true,
            contentType: true,
            date: true,
            status: true
          }
        },
        // Sorumlu Kişilerin Bilgilerini Getir
        socialUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        designerUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        reelsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        adsUser: { select: { id: true, name: true, avatar: true, roleTitle: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Her client için usedQuota hesapla (task'lardan)
    const clientsWithQuota = clients.map((client: any) => {
      const usedQuota = {
        reels: client.tasks.filter((t: any) => t.contentType === 'reels').length,
        reelsCompleted: client.tasks.filter((t: any) => t.contentType === 'reels' && t.status === 'tamamlandi').length,
        posts: client.tasks.filter((t: any) => t.contentType === 'posts').length,
        postsCompleted: client.tasks.filter((t: any) => t.contentType === 'posts' && t.status === 'tamamlandi').length,
        stories: client.tasks.filter((t: any) => t.contentType === 'stories').length,
        storiesCompleted: client.tasks.filter((t: any) => t.contentType === 'stories' && t.status === 'tamamlandi').length
      };

      // Planned dates by content type
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

      return {
        id: client.id,
        name: client.name,
        logo: client.logo,
        packageType: client.packageType,
        startDate: client.startDate.toISOString().split('T')[0],
        renewalDate: client.renewalDate.toISOString().split('T')[0],
        
        // Yeni Alanlar
        reelsQuota: client.reelsQuota,
        postsQuota: client.postsQuota,
        storiesQuota: client.storiesQuota,
        
        socialUser: client.socialUser,
        designerUser: client.designerUser,
        reelsUser: client.reelsUser,
        adsUser: client.adsUser,
        adsPeriod: client.adsPeriod,

        usedQuota,
        plannedDates,
        hasPortalAccess: !!(client.username && client.password),
        portalUsername: client.username || null,
        createdAt: client.createdAt
      };
    });

    return NextResponse.json({ clients: clientsWithQuota });
  } catch (error) {
    console.error('Clients GET error:', error);
    return NextResponse.json(
      { error: 'Müşteriler yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Yeni müşteri ekle (admin only)
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
    const { 
      name, 
      logo, 
      packageType, 
      startDate, 
      renewalDate,
      socialUserId,
      designerUserId,
      reelsUserId,
      adsUserId,
      adsPeriod,
      // Custom Quota
      reelsQuota,
      postsQuota,
      storiesQuota
    } = body;

    // Validasyon
    if (!name || !packageType || !startDate || !renewalDate) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: name, packageType, startDate, renewalDate' },
        { status: 400 }
      );
    }

    // Paket tipi kontrolü
    const validPackages = ['vitrin', 'plus', 'premium', 'custom']; // 'custom' eklendi
    if (!validPackages.includes(packageType)) {
      return NextResponse.json(
        { error: 'Geçersiz paket tipi.' },
        { status: 400 }
      );
    }
    
    // Custom Validation
    if (packageType === 'custom') {
      if (reelsQuota === undefined || postsQuota === undefined || storiesQuota === undefined) {
          return NextResponse.json(
            { error: 'Özel paket için kota bilgileri zorunludur.' },
            { status: 400 }
          );
      }
    }

    const client = await prisma.client.create({
      data: {
        name,
        logo: logo || null,
        packageType,
        startDate: new Date(startDate),
        renewalDate: new Date(renewalDate),
        
        // Custom Quota
        reelsQuota: packageType === 'custom' ? Number(reelsQuota) : null,
        postsQuota: packageType === 'custom' ? Number(postsQuota) : null,
        storiesQuota: packageType === 'custom' ? Number(storiesQuota) : null,
        
        // Atamalar (Opsiyonel olabilir, yoksa null geçeriz)
        socialUserId: socialUserId || null,
        designerUserId: designerUserId || null,
        reelsUserId: reelsUserId || null,
        adsUserId: adsUserId || null,
        adsPeriod: adsPeriod || null
      },
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
        startDate: client.startDate.toISOString().split('T')[0],
        renewalDate: client.renewalDate.toISOString().split('T')[0],
        usedQuota: { reels: 0, posts: 0, stories: 0 },
        plannedDates: { reels: [], posts: [], stories: [] }
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Clients POST error:', error);
    return NextResponse.json(
      { error: 'Müşteri oluşturulurken hata oluştu' },
      { status: 500 }
    );
  }
}
