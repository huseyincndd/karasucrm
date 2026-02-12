import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

const SERVICE_LABELS: Record<string, string> = {
  'social_media_management': 'Sosyal Medya Yönetimi',
  'meta_ads': 'Meta Reklam Yönetimi',
  'consultancy': 'Danışmanlık',
  'other': 'Diğer Hizmet'
};

export async function POST(request: NextRequest) {
  const user = verifyAuth(request);
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { clientId, userId, serviceType, startDate, days, price } = body;

    if (!clientId || !userId || !serviceType || !startDate || !days || price === undefined) {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 });
    }

    // Tarih hesapla
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    // Transaction başlat (Hem hizmet kaydı hem cüzdan işlemi)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Hizmet Kaydı
      const service = await tx.clientService.create({
        data: {
          clientId,
          userId,
          serviceType,
          startDate: start,
          endDate: end,
          days,
          price: parseFloat(price),
          isPaid: true
        },
        include: {
          client: { select: { name: true } }
        }
      });

      // 2. Cüzdan İşlemi
      const serviceName = SERVICE_LABELS[serviceType] || serviceType;
      const description = `${service.client.name} - ${serviceName} (${days} Gün)`;

      await tx.walletTransaction.create({
        data: {
          amount: parseFloat(price),
          contentType: 'service_fee', // Özel tip
          description,
          userId,
          serviceId: service.id,
          createdAt: new Date() // İşlem şu an yapıldı
        }
      });

      return service;
    });

    return NextResponse.json({ success: true, service: result });

  } catch (error) {
    console.error('Service creation error:', error);
    return NextResponse.json({ error: 'Hizmet oluşturulamadı' }, { status: 500 });
  }
}
