import { json } from "@/lib/http";
import { storeHealth } from "@/lib/store";

export const dynamic = "force-dynamic";

// Diagnóstico rápido: GET /codenames/api/health
export async function GET() {
  const health = await storeHealth();
  return json(health, health.ok ? 200 : 503);
}
