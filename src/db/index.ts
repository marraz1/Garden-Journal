import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "production") {
  // Not fatal at import time: `next build` must succeed without a database,
  // and every page that touches data is dynamic anyway.
  console.warn("[db] DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// The WebSocket pool (rather than the HTTP driver) is required because garden
// creation and invite redemption run inside transactions.
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { schema };
