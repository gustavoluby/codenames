import { cleanRoomCode, isValidPlayerId, randomRoomCode } from "@/lib/code";
import { createRoom, viewFor, GameError } from "@/lib/game";
import { errorResponse, json } from "@/lib/http";
import { roomExists, saveRoom, touchPresence } from "@/lib/store";

export const dynamic = "force-dynamic";

// Cria uma sala nova. Quem cria vira admin.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, playerId } = body as { name?: string; playerId?: string };
    if (!isValidPlayerId(playerId)) throw new GameError("Identificador de jogador inválido.");

    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = cleanRoomCode(randomRoomCode());
      if (!(await roomExists(candidate))) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Não consegui gerar um código de sala. Tente de novo.");

    const room = createRoom(code, { id: playerId, name: name ?? "" }, Date.now());
    await saveRoom(room);
    await touchPresence(code, playerId);
    return json({ code, room: viewFor(room, playerId) });
  } catch (err) {
    return errorResponse(err);
  }
}
