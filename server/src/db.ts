import { PrismaClient } from '@prisma/client';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

// Ultra-reliable Node https fetch adapter to prevent Windows IPv6 undici ConnectTimeout
function robustHttpsFetch(url: string | URL, options: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            text: async () => data,
            json: async () => JSON.parse(data),
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Inject robust HTTPS fetch into Neon driver
(neonConfig as any).fetchFunction = robustHttpsFetch;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_WvHBlgybz8K7@ep-snowy-salad-b4xriomi.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

  const adapter = new (PrismaNeonHTTP as any)(connectionString, {});

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
