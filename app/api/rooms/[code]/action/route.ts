import { HOST_TIMEOUT_MS } from "@/lib/config";
import { cleanRoomCode, isValidPlayerId } from "@/lib/code";
import { applyAction, GameError, viewFor } from "@/lib/game";
import { errorResponse, json } from "@/lib/http";
import { getPresence, getRoom, saveRoom, touchPresence, withRoomLock } from "@/lib/store";
import type { Action } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = cleanRoomCode((await params).code);
    const body = await req.json().catch(() => ({}));
    const { playerId, action } = body as { playerId?: string; action?: Action };
    if (!isValidPlayerId(playerId)) throw new GameError("Identificador de jogador inválido.");
    if (!action || typeof action !== "object" || typeof action.type !== "string") throw new GameError("Ação inválida.");

    const view = await withRoomLock(code, async () => {
      const room = await getRoom(code);
      if (!room) throw new GameError("Sala não encontrada ou expirada.");

      let hostIsStale = false;
      if (action.type === "claimHost") {
        const presence = await getPresence(code);
        hostIsStale = Date.now() - (presence[room.hostId] ?? 0) > HOST_TIMEOUT_MS;
      }

      applyAction(room, playerId, action, { now: Date.now(), rng: Math.random, hostIsStale });
      await saveRoom(room);
      return viewFor(room, playerId);
    });

    if (action.type !== "leave") await touchPresence(code, playerId);
    return json({ room: view });
  } catch (err) {
    return errorResponse(err);
  }
}
