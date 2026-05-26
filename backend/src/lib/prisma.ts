import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Prisma transaction client — use as the type for `tx` parameters in service functions. */
export type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export default prisma;
