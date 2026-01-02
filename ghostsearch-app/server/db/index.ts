import * as schema from "./schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function createDbConnection(databaseUrl: string) {
  // Disable prefetch as it is not supported for "Transaction" pool mode
  const client = postgres(databaseUrl, { prepare: false });
  const db = drizzle({ client, schema });
  return db;
}

export const db = createDbConnection(databaseUrl);

export type DB = ReturnType<typeof createDbConnection>;
export type Queryable = Pick<
  DB,
  "select" | "insert" | "update" | "delete" | "query"
>;
