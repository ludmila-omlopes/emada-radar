import { Pool } from "pg";

const globalForDb = globalThis as unknown as { emadaPool?: Pool };
export const databaseConfigured = () => Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
export function getDb() {
  if (!databaseConfigured()) throw new Error("Postgres ainda não configurado.");
  if (!globalForDb.emadaPool) {
    globalForDb.emadaPool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      max: 3, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.emadaPool;
}
