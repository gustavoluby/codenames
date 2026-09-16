import { NextResponse } from "next/server";
import { GameError } from "./game";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err: unknown) {
  if (err instanceof GameError) return json({ error: err.message }, 400);
  console.error(err);
  const message = err instanceof Error ? err.message : "Erro inesperado.";
  return json({ error: message }, 500);
}
