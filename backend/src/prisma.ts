import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!client) {
    const adapter = new PrismaPg({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/donortrack",
    });
    client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    } as any);
  }
  return client;
}

export default new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});
