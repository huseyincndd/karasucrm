
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = verifyAuth(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.isClient) {
       return NextResponse.json({ error: 'Clients cannot access this resource' }, { status: 403 });
    }

    // Since token might be stale regarding admin status (though less likely if short lived),
    // we can trust the token generally, or re-fetch user if critical.
    // For listing projects, using token's userId is fine.
    // But let's re-fetch isAdmin just to be safe if desired, or trust the token.
    // The previous implementation fetched isAdmin. Let's stick to that pattern if needed,
    // or just trust user.isAdmin from token.
    // However, verifyAuth returns JWTPayload which has isAdmin.
    
    // Let's refetch user to get up-to-date assignment data if we were doing more complex logic,
    // but here we just need ID and Admin status.
    
    const userId = user.userId;
    const isAdmin = user.isAdmin;

    let clients;

    // Define the select object to include team members
    const selectTeam = {
      id: true,
      name: true,
      logo: true,
      packageType: true,
      createdAt: true,
      // Team Members
      socialUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
      designerUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
      reelsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
      adsUsers: { select: { id: true, name: true, avatar: true, roleTitle: true } },
      // Counts for context
      _count: {
        select: {
          tasks: true
        }
      }
    };

    if (isAdmin) {
      // Admin sees ALL clients
      clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
        select: selectTeam,
      });
    } else {
      // Staff sees only clients they are assigned to
      clients = await prisma.client.findMany({
        where: {
          OR: [
            { socialUsers: { some: { id: userId } } },
            { designerUsers: { some: { id: userId } } },
            { reelsUsers: { some: { id: userId } } },
            { adsUsers: { some: { id: userId } } },
          ]
        } as any,
        orderBy: { name: 'asc' },
        select: selectTeam,
      });
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
