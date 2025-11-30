import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma client instance for the whole app.
 * Avoids creating per-route clients that leak connections.
 */
export const prisma = new PrismaClient();
