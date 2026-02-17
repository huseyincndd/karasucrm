import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getSalaryPeriod, getPreviousSalaryPeriod } from '@/constants/wallet';

// GET /api/wallet - Cüzdan bilgisi + işlem geçmişi getir
// Maaş dönemi: Ayın 5'inden bir sonraki ayın 4'üne kadar
// GET /api/wallet - Cüzdan bilgisi + işlem geçmişi getir
// Maaş dönemi: Ayın 5'inden bir sonraki ayın 4'üne kadar
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
    const staffId = searchParams.get('staffId');
    const periodType = searchParams.get('period') || 'current'; // 'current' veya 'previous'

    // Kimin cüzdanını gösterelim?
    let targetUserId = user.userId;
    if (user.isAdmin && staffId) {
      targetUserId = staffId;
    }

    // Maaş dönemini hesapla (5'inden 5'ine)
    const now = new Date();
    const currentPeriod = getSalaryPeriod(now);
    const previousPeriod = getPreviousSalaryPeriod(now);
    const activePeriod = periodType === 'previous' ? previousPeriod : currentPeriod;

    // --- CURRENT PERIOD TRANSACTIONS ---
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        userId: targetUserId,
        OR: [
          { task: { date: { gte: activePeriod.start, lte: activePeriod.end } } },
          { taskId: null, createdAt: { gte: activePeriod.start, lte: activePeriod.end } }
        ]
      },
      include: {
        task: {
          select: {
            id: true, title: true, contentType: true, date: true, status: true,
            client: { select: { id: true, name: true, logo: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Bu dönem KAZANÇ (Sadece pozitifler)
    const periodEarnings = transactions
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // --- PREVIOUS PERIOD TRANSACTIONS ---
    const prevPeriodTransactions = await prisma.walletTransaction.findMany({
      where: {
        userId: targetUserId,
        OR: [
          { task: { date: { gte: previousPeriod.start, lte: previousPeriod.end } } },
          { taskId: null, createdAt: { gte: previousPeriod.start, lte: previousPeriod.end } }
        ]
      },
      include: {
        task: {
          select: {
            id: true, title: true, contentType: true, date: true, status: true,
            client: { select: { id: true, name: true, logo: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Önceki dönem KAZANÇ (Sadece pozitifler)
    const prevPeriodEarnings = prevPeriodTransactions
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    // --- LIFETIME STATS ---
    const allTransactions = await prisma.walletTransaction.findMany({
      where: { userId: targetUserId },
      select: { amount: true }
    });

    const totalEarnings = allTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPaid = allTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const balance = totalEarnings - totalPaid;

    // --- CONTENT TYPE BREAKDOWN (Active Period Earnings) ---
    const byContentType: Record<string, { total: number; count: number }> = {};
    transactions.forEach((t: any) => {
      // Sadece kazançları grafikte göster
      if (t.amount > 0) {
        if (!byContentType[t.contentType]) {
          byContentType[t.contentType] = { total: 0, count: 0 };
        }
        byContentType[t.contentType].total += t.amount;
        byContentType[t.contentType].count += 1;
      }
    });

    // Kullanıcı bilgisi
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, name: true, avatar: true, roleTitle: true,
      }
    });

    // Format helper
    const formatTransaction = (t: any) => ({
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
        status: t.task.status,
        clientName: t.task.client.name,
        clientLogo: t.task.client.logo,
      } : null
    });

    return NextResponse.json({
      user: targetUser ? {
        ...targetUser,
        role: targetUser.roleTitle,
        department: targetUser.roleTitle,
      } : null,
      balance, // Net Bakiye (Alacak)
      totalEarnings, // Toplam Hak Ediş
      totalPaid,    // Toplam Ödenen
      periodEarnings, // Bu Dönem Hak Ediş
      periodLabel: activePeriod.label,
      previousPeriod: {
        earnings: prevPeriodEarnings, // Geçen Dönem Hak Ediş
        label: previousPeriod.label,
        transactions: prevPeriodTransactions.map(formatTransaction),
      },
      currentPeriod: {
        label: currentPeriod.label,
      },
      byContentType: Object.entries(byContentType).map(([contentType, data]) => ({
        contentType,
        total: data.total,
        count: data.count,
      })),
      transactions: transactions.map(formatTransaction),
    });
  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json(
      { error: 'Cüzdan bilgisi yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
