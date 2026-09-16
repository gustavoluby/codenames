import { cleanRoomCode, isValidPlayerId } from "@/lib/code";
import { viewFor } from "@/lib/game";
import { errorResponse, json } from "@/lib/http";
import { getPresence, getRoom, getVersion, touchPresence } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Polling do estado da sala.
 * ?player=ID&since=VERSAO → se nada mudou, responde só { changed: false } (1 leitura barata no Redis).
 * &touch=1 → marca presença do jogador e devolve o mapa de quem está online.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = cleanRoomCode((await params).code);
    const url = new URL(req.url);
    const player = url.searchParams.get("player");
    const since = Number(url.searchParams.get("since") ?? -1);
    const touch = url.searchParams.get("touch") === "1";

    let presence: Record<string, number> | undefined;
    if (touch && isValidPlayerId(player)) {
      await touchPresence(code, player);
      presence = await getPresence(code);
    }

    const version = await getVersion(code);
    if (version === null) return json({ error: "Sala não encontrada ou expirada." }, 404);
    if (version === since) return json({ changed: false, version, presence });

    const room = await getRoom(code);
    if (!room) return json({ error: "Sala não encontrada ou expirada." }, 404);
    return json({ changed: true, version: room.version, room: viewFor(room, isValidPlayerId(player) ? player : null), presence });
  } catch (err) {
    return errorResponse(err);
  }
}
