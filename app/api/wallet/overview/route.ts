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

    // Her kullanıcı için cüzdan özetini hesapla
    const staffWallets = await Promise.all(
      users.map(async (u) => {
        // Toplam kazanç (tüm zamanlar)
        const totalEarnings = await prisma.walletTransaction.aggregate({
          where: { userId: u.id },
          _sum: { amount: true },
        });

        // Bu dönem işlemleri (görev tarihi VEYA createdAt döneme ait)
        const currentTransactions = await prisma.walletTransaction.findMany({
          where: {
            userId: u.id,
            OR: [
              {
                task: {
                  date: {
                    gte: currentPeriod.start,
                    lte: currentPeriod.end,
                  }
                }
              },
              {
                taskId: null,
                createdAt: {
                  gte: currentPeriod.start,
                  lte: currentPeriod.end,
                }
              }
            ]
          },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                contentType: true,
                date: true,
                client: {
                  select: {
                    name: true,
                    logo: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        const periodEarnings = currentTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

        // Önceki dönem kazancı
        const prevTransactions = await prisma.walletTransaction.findMany({
          where: {
            userId: u.id,
            OR: [
              {
                task: {
                  date: {
                    gte: previousPeriod.start,
                    lte: previousPeriod.end,
                  }
                }
              },
              {
                taskId: null,
                createdAt: {
                  gte: previousPeriod.start,
                  lte: previousPeriod.end,
                }
              }
            ]
          },
        });
        const prevPeriodEarnings = prevTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

        // İçerik tipine göre dağılım (bu dönem)
        const byContentType: Record<string, { total: number; count: number }> = {};
        currentTransactions.forEach((t: any) => {
          if (!byContentType[t.contentType]) {
            byContentType[t.contentType] = { total: 0, count: 0 };
          }
          byContentType[t.contentType].total += t.amount;
          byContentType[t.contentType].count += 1;
        });

        return {
          user: {
            ...u,
            role: u.roleTitle,
            department: u.roleTitle, // Legacy support
          },
          totalBalance: totalEarnings._sum.amount || 0,
          periodEarnings,
          periodTaskCount: currentTransactions.length,
          prevPeriodEarnings,
          prevPeriodTaskCount: prevTransactions.length,
          byContentType: Object.entries(byContentType).map(([contentType, data]) => ({
            contentType,
            total: data.total,
            count: data.count,
          })),
          recentTransactions: currentTransactions.map((t: any) => ({
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
      })
    );

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
