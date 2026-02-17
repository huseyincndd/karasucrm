import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

interface TokenPayload {
  userId: string;
  isClient?: boolean;
  clientId?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Token'ı cookie'den al
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 401 }
      );
    }

    // Token'ı doğrula
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return NextResponse.json(
        { error: 'Geçersiz oturum' },
        { status: 401 }
      );
    }

    // Müşteri girişi mi kontrol et
    if (decoded.isClient && decoded.clientId) {
      // Client tablosundan getir
      const client: any = await prisma.client.findUnique({
        where: { id: decoded.clientId },
        select: {
          id: true,
          name: true,
          username: true,
          logo: true,
          packageType: true,
          startDate: true,
          renewalDate: true,
          reelsQuota: true,
          postsQuota: true,
          storiesQuota: true,
          services: {
            where: {
              endDate: { gte: new Date() } // Aktif (Devam Eden/Gelecek) Hizmetler
            },
            select: {
              id: true,
              serviceType: true,
              startDate: true,
              endDate: true
            },
            orderBy: { endDate: 'asc' }
          },
          // Sorumlu Kişiler
          socialUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
          designerUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
          reelsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
          adsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } }
        } as any
      });

      if (!client) {
        return NextResponse.json(
          { error: 'Müşteri bulunamadı' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        user: {
          id: client.id,
          username: client.username,
          name: client.name,
          role: 'Müşteri', // Frontend roleTitle bekliyordu ama mock user'da öyle. Burası 'role' kalsın, FE'de 'roleTitle' yoksa 'role' kullanılır.
          roleTitle: 'Müşteri',
          department: '',
          avatar: client.logo,
          isAdmin: false,
          isClient: true,
          clientId: client.id,
          packageType: client.packageType,
          reelsQuota: client.reelsQuota,
          postsQuota: client.postsQuota,
          storiesQuota: client.storiesQuota,
          services: client.services.map((s: any) => ({
             ...s,
             startDate: s.startDate.toISOString().split('T')[0],
             endDate: s.endDate.toISOString().split('T')[0]
          })),
          // Sorumlu Ekip
          socialUsers: client.socialUsers,
          designerUsers: client.designerUsers,
          reelsUsers: client.reelsUsers,
          adsUsers: client.adsUsers
        }
      });
    }

    // Normal kullanıcı (ekip üyesi)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        name: true,
        roleTitle: true,
        // department: true, // Removed
        avatar: true,
        isAdmin: true,
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

    return NextResponse.json({
      user: {
        ...user,
        isClient: false
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Bir hata oluştu' },
      { status: 500 }
    );
  }
}
