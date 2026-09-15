import { PrismaClient } from "@prisma/client";

declare global { var buyerOriginPrisma: PrismaClient | undefined; }
const prisma = global.buyerOriginPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.buyerOriginPrisma = prisma;
export default prisma;
