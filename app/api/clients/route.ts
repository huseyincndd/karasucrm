import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';

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
        // Sorumlu Kişilerin Bilgilerini Getir (Artık Array)
        socialUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        designerUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        reelsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        adsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } }
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
        
        socialUsers: client.socialUsers,
        designerUsers: client.designerUsers,
        reelsUsers: client.reelsUsers,
        adsUsers: client.adsUsers,
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
      socialUserIds,    // Artık Array ID
      designerUserIds,  // Artık Array ID
      reelsUserIds,     // Artık Array ID
      adsUserIds,       // Artık Array ID
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
    const validPackages = ['vitrin', 'plus', 'premium', 'custom']; 
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
        
        // Atamalar (Many-to-Many Connect)
        socialUsers: socialUserIds?.length ? { connect: socialUserIds.map((id: string) => ({ id })) } : undefined,
        designerUsers: designerUserIds?.length ? { connect: designerUserIds.map((id: string) => ({ id })) } : undefined,
        reelsUsers: reelsUserIds?.length ? { connect: reelsUserIds.map((id: string) => ({ id })) } : undefined,
        adsUsers: adsUserIds?.length ? { connect: adsUserIds.map((id: string) => ({ id })) } : undefined,
        
        adsPeriod: adsPeriod || null
      },
      include: {
        socialUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        designerUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        reelsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
        adsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } }
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
