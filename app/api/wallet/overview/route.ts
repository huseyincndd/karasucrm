import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import { getSalaryPeriod, getPreviousSalaryPeriod } from '@/constants/wallet';

// GET /api/wallet/overview - Tüm personelin cüzdan özeti (Admin only)
// Maaş dönemi: Ayın 5'inden bir sonraki ayın 4'üne kadar
export async function GET(request: NextRequest) {
  const admin = verifyAdmin(request);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Bu işlem için admin yetkisi gerekli' },
      { status: 403 }
    );
  }

  try {
    const now = new Date();
    const currentPeriod = getSalaryPeriod(now);
    const previousPeriod = getPreviousSalaryPeriod(now);

    // Tüm kullanıcıları getir
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        roleTitle: true,
        capabilities: {
          select: {
            type: true,
            price: true,
          }
        },
      },
      orderBy: { name: 'asc' }
    });

    const userIds = users.map(u => u.id);

    // 1. Tüm zamanlar toplam bakiye (Gruplanmış)
    const allTimeStats = await prisma.walletTransaction.groupBy({
      by: ['userId'],
      _sum: { amount: true },
      where: { userId: { in: userIds } }
    });

    // 2. Bu dönem işlemleri (Toplu çekim)
    const currentTransactions = await prisma.walletTransaction.findMany({
      where: {
        userId: { in: userIds },
        OR: [
          { task: { date: { gte: currentPeriod.start, lte: currentPeriod.end } } },
          { taskId: null, createdAt: { gte: currentPeriod.start, lte: currentPeriod.end } }
        ]
      },
      include: {
        task: {
          select: {
            id: true, title: true, contentType: true, date: true,
            client: { select: { name: true, logo: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Önceki dönem işlemleri (Toplu çekim)
    const prevTransactions = await prisma.walletTransaction.findMany({
      where: {
        userId: { in: userIds },
        OR: [
          { task: { date: { gte: previousPeriod.start, lte: previousPeriod.end } } },
          { taskId: null, createdAt: { gte: previousPeriod.start, lte: previousPeriod.end } }
        ]
      }
    });

    // Verileri işle ve birleştir
    const staffWallets = users.map(u => {
        // Kullanıcının verilerini filtrele
        const userTotal = allTimeStats.find(s => s.userId === u.id)?._sum.amount || 0;
        
        const userCurrentTx = currentTransactions.filter(t => t.userId === u.id);
        const userPrevTx = prevTransactions.filter(t => t.userId === u.id);

        // Bu dönem HAK EDİŞ (Sadece pozitifler)
        const periodEarnings = userCurrentTx
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);

        // Önceki dönem HAK EDİŞ (Sadece pozitifler)
        const prevPeriodEarnings = userPrevTx
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);

        // İçerik dağılımı
        const byContentType: Record<string, { total: number; count: number }> = {};
        userCurrentTx.forEach((t) => {
          if (t.amount > 0) { // Sadece kazançlar
            if (!byContentType[t.contentType]) {
              byContentType[t.contentType] = { total: 0, count: 0 };
            }
            byContentType[t.contentType].total += t.amount;
            byContentType[t.contentType].count += 1;
          }
        });

        return {
          user: {
            ...u,
            role: u.roleTitle,
            department: u.roleTitle,
          },
          totalBalance: userTotal,
          periodEarnings,
          periodTaskCount: userCurrentTx.length,
          prevPeriodEarnings,
          prevPeriodTaskCount: userPrevTx.length,
          byContentType: Object.entries(byContentType).map(([contentType, data]) => ({
            contentType,
            total: data.total,
            count: data.count,
          })),
          recentTransactions: userCurrentTx.slice(0, 5).map((t) => ({
            id: t.id,
            amount: t.amount,
            contentType: t.contentType,
            description: t.description,
            createdAt: t.createdAt.toISOString(),
            task: t.task ? {
              id: t.task.id,
              title: t.task.title,
              contentType: t.task.contentType,
              date: t.task.date.toISOString().split('T')[0],
              clientName: t.task.client.name,
              clientLogo: t.task.client.logo,
            } : null,
          })),
        };
    });

    // Toplam istatistikler
    const grandTotal = staffWallets.reduce((sum, sw) => sum + sw.totalBalance, 0);
    const periodTotal = staffWallets.reduce((sum, sw) => sum + sw.periodEarnings, 0);
    const periodTasks = staffWallets.reduce((sum, sw) => sum + sw.periodTaskCount, 0);
    const prevPeriodTotal = staffWallets.reduce((sum, sw) => sum + sw.prevPeriodEarnings, 0);

    return NextResponse.json({
      staffWallets,
      currentPeriod: {
        label: currentPeriod.label,
        key: currentPeriod.key,
      },
      previousPeriod: {
        label: previousPeriod.label,
        key: previousPeriod.key,
        total: prevPeriodTotal,
      },
      summary: {
        grandTotal,
        periodTotal,
        periodTasks,
        prevPeriodTotal,
        staffCount: users.length,
      }
    });
  } catch (error) {
    console.error('Wallet overview GET error:', error);
    return NextResponse.json(
      { error: 'Cüzdan özeti yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
