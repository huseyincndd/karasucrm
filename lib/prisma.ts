import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 1, // Vercel Cloud (Serverless) her çalışan lambda için en fazla 1 bağlantı açsın
    allowExitOnIdle: true, // İşlem bittiğinde bağlantıyı bekletmeden havuza geri salsın
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000 
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
