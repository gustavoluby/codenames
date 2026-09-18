"use client";

import { useEffect, useRef, useState } from "react";
import { ASSASSIN_LABEL } from "./config";
import { play } from "./sound";
import type { CardColor, RoomView, Team } from "./types";

export interface Banner {
  id: number;
  kind: "turn" | "clue" | "win" | "start";
  team?: Team;
  sub: string;
  title: string;
  n?: string;
}

export interface Flash {
  id: number;
  color: CardColor;
}

/** Quanto cada anúncio fica na tela (precisa bater com a duração da animação no CSS). */
const BANNER_MS: Record<Banner["kind"], number> = { turn: 1900, clue: 2100, start: 2400, win: 2800 };
const FLASH_MS = 900;

interface Snapshot {
  /** identidade do baralho: muda quando uma partida nova é distribuída */
  deck: string;
  turn: Team;
  clue: string;
  winner: Team | null;
  revealed: boolean[];
  marks: number;
  players: number;
  /** quem já tem time e função: id -> "time:função" */
  enlisted: Record<string, string>;
}

/**
 * Compara a sala com a leitura anterior e transforma a diferença em coisas que dá para ver e ouvir:
 * faixa de anúncio, clarão na tela e efeito sonoro. Sem isso a tela só troca de estado, do nada.
 */
export function useRoomEvents(room: RoomView | null) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const prev = useRef<Snapshot | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!room) return;
    const game = room.game;
    const names = room.settings.teamNames;
    const snap: Snapshot = {
      deck: game ? game.cards.map((c) => c.word).join("|") : "",
      turn: game?.turn ?? "blue",
      clue: game?.clue ? `${game.clue.by}|${game.clue.word}|${game.clue.count}` : "",
      winner: game?.winner ?? null,
      revealed: game ? game.cards.map((c) => c.revealed) : [],
      marks: game ? game.cards.reduce((n, c) => n + c.marks.length, 0) : 0,
      players: room.players.length,
      enlisted: Object.fromEntries(room.players.filter((p) => p.team).map((p) => [p.id, `${p.team}:${p.role}`])),
    };
    const before = prev.current;
    prev.current = snap;
    // Primeira leitura (ou quem acabou de abrir a sala): só fotografa, não anuncia nada.
    if (!before) return;

    const announce = (b: Omit<Banner, "id">) => setBanner({ id: ++seq.current, ...b });

    if (snap.players > before.players) play("join");

    // Entrou num time (inclusive pelo sorteio, que enche vários de uma vez): carimbo no dossiê.
    const fresh = Object.keys(snap.enlisted).filter((id) => !before.enlisted[id]);
    if (fresh.length > 0) play(fresh.includes(room.you?.id ?? "") ? "enlist" : "enlistOther");

    if (snap.deck && snap.deck !== before.deck) {
      announce({ kind: "start", sub: "Dossiê aberto", title: "A missão começou" });
      play("deal");
      return;
    }
    if (!game) return;

    // Carta revelada: clarão na cor do resultado e som conforme quem levou a carta.
    const i = snap.revealed.findIndex((r, idx) => r && !before.revealed[idx]);
    if (i >= 0) {
      const color = game.cards[i].color;
      if (color) {
        setFlash({ id: ++seq.current, color });
        // Quem ouve importa: carta do seu time é boa notícia mesmo quando quem revelou foi o outro time.
        // Espectador ouve pela ótica de quem estava jogando.
        const side = room.you?.team ?? before.turn;
        play(color === "assassin" ? "assassin" : color === "neutral" ? "neutral" : color === side ? "own" : "enemy");
      }
    } else if (snap.marks > before.marks) {
      play("vote");
    } else if (snap.marks < before.marks) {
      play("unvote");
    }

    if (snap.winner && !before.winner) {
      const byAssassin = game.winReason === "assassin";
      announce({
        kind: "win",
        team: snap.winner,
        sub: byAssassin ? `O ${ASSASSIN_LABEL} apareceu` : "Todos os agentes encontrados",
        title: `${names[snap.winner]} venceu`,
      });
      // espectador comemora junto; quem perdeu leva o trombone
      const youLost = !!room.you?.team && room.you.team !== snap.winner;
      setTimeout(() => play(youLost ? "lose" : "win"), byAssassin ? 900 : 260);
      return;
    }
    if (snap.clue && snap.clue !== before.clue && game.clue) {
      announce({
        kind: "clue",
        team: game.clue.team,
        sub: `${game.clue.by} deu a dica`,
        title: game.clue.word,
        n: game.clue.count === null ? "∞" : String(game.clue.count),
      });
      play("clue");
      return;
    }
    if (snap.turn !== before.turn) {
      announce({ kind: "turn", team: snap.turn, sub: "Agora é a vez de", title: names[snap.turn] });
      play("turn");
    }
  }, [room]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner((b) => (b?.id === banner.id ? null : b)), BANNER_MS[banner.kind]);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash((f) => (f?.id === flash.id ? null : f)), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  return { banner, flash };
}
