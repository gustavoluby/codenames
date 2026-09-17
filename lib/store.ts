import { Redis } from "@upstash/redis";
import { ROOM_TTL_SECONDS } from "./config";
import type { Room } from "./types";

/**
 * Armazenamento das salas.
 * - Com Upstash Redis configurado (produção/Vercel): tudo fica no Redis.
 * - Sem variáveis de ambiente: memória do processo (só serve para `npm run dev`,
 *   porque na Vercel cada função serverless tem sua própria memória).
 */

// A integração da Vercel pode criar as variáveis com prefixo (ex.: MEUBANCO_KV_REST_API_URL),
// então procuramos pelo final do nome. Token somente leitura não serve.
const envKeys = Object.keys(process.env);
const findEnv = (suffixes: string[]) =>
  envKeys.find((k) => suffixes.some((s) => k === s || k.endsWith(`_${s}`)) && !k.includes("READ_ONLY") && process.env[k]);
const urlKey = findEnv(["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"]);
const tokenKey = findEnv(["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"]);
const redis = urlKey && tokenKey ? new Redis({ url: process.env[urlKey]!, token: process.env[tokenKey]! }) : null;

type MemEntry = { value: unknown; expiresAt: number };
const g = globalThis as unknown as { __leadSecretoMem?: Map<string, MemEntry> };
const mem = (g.__leadSecretoMem ??= new Map<string, MemEntry>());

function memGet<T>(key: string): T | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value as T;
}
function memSet(key: string, value: unknown, ttlMs: number) {
  mem.set(key, { value: structuredClone(value), expiresAt: Date.now() + ttlMs });
}

const roomKey = (code: string) => `ls:room:${code}`;
const versionKey = (code: string) => `ls:room:${code}:v`;
const lockKey = (code: string) => `ls:room:${code}:lock`;
const presenceKey = (code: string) => `ls:room:${code}:presence`;

export const usingRedis = Boolean(redis);

/** Diagnóstico para /api/health: qual armazenamento está ativo e se o Redis responde. */
export async function storeHealth() {
  const started = Date.now();
  // Só nomes de variáveis, nunca valores.
  const redisEnvNames = envKeys.filter((k) => /KV_|REDIS|UPSTASH/.test(k)).sort();
  if (!redis) {
    return {
      storage: "memory" as const,
      ok: !process.env.VERCEL,
      ms: 0,
      redisEnvNames,
      error: process.env.VERCEL ? "Sem Upstash Redis: na Vercel as salas somem entre servidores." : undefined,
    };
  }
  try {
    await redis.ping();
    return { storage: "redis" as const, ok: true, ms: Date.now() - started, using: [urlKey, tokenKey] };
  } catch (err) {
    return { storage: "redis" as const, ok: false, ms: Date.now() - started, using: [urlKey, tokenKey], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getRoom(code: string): Promise<Room | null> {
  if (redis) return (await redis.get<Room>(roomKey(code))) ?? null;
  const r = memGet<Room>(roomKey(code));
  return r ? structuredClone(r) : null;
}

export async function getVersion(code: string): Promise<number | null> {
  if (redis) {
    const v = await redis.get<number>(versionKey(code));
    return v === null || v === undefined ? null : Number(v);
  }
  return memGet<number>(versionKey(code));
}

export async function saveRoom(room: Room): Promise<void> {
  if (redis) {
    const p = redis.pipeline();
    p.set(roomKey(room.code), room, { ex: ROOM_TTL_SECONDS });
    p.set(versionKey(room.code), room.version, { ex: ROOM_TTL_SECONDS });
    p.expire(presenceKey(room.code), ROOM_TTL_SECONDS);
    await p.exec();
    return;
  }
  memSet(roomKey(room.code), room, ROOM_TTL_SECONDS * 1000);
  memSet(versionKey(room.code), room.version, ROOM_TTL_SECONDS * 1000);
}

export async function roomExists(code: string): Promise<boolean> {
  if (redis) return (await redis.exists(roomKey(code))) === 1;
  return memGet(roomKey(code)) !== null;
}

/** Trava simples por sala para duas ações simultâneas não se sobrescreverem. */
export async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  if (!redis) return fn(); // Node local processa uma requisição por vez nesse trecho
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 40; attempt++) {
    const ok = await redis.set(lockKey(code), token, { nx: true, px: 4000 });
    if (ok) {
      try {
        return await fn();
      } finally {
        const current = await redis.get<string>(lockKey(code));
        if (current === token) await redis.del(lockKey(code));
      }
    }
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 60));
  }
  throw new Error("A sala está ocupada. Tente de novo.");
}

export async function touchPresence(code: string, playerId: string): Promise<void> {
  if (redis) {
    await redis.hset(presenceKey(code), { [playerId]: Date.now() });
    return;
  }
  const map = memGet<Record<string, number>>(presenceKey(code)) ?? {};
  map[playerId] = Date.now();
  memSet(presenceKey(code), map, ROOM_TTL_SECONDS * 1000);
}

export async function getPresence(code: string): Promise<Record<string, number>> {
  if (redis) {
    const raw = (await redis.hgetall<Record<string, number | string>>(presenceKey(code))) ?? {};
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]));
  }
  return memGet<Record<string, number>>(presenceKey(code)) ?? {};
}
