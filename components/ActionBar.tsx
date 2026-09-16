"use client";

import { useState } from "react";
import type { Action, RoomView } from "@/lib/types";

const COUNTS: (number | null)[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, null];

export default function ActionBar({ room, act }: { room: RoomView; act: (a: Action) => Promise<boolean> }) {
  const game = room.game!;
  const you = room.you;
  const [word, setWord] = useState("");
  const [count, setCount] = useState<number | null>(1);
  const [sending, setSending] = useState(false);

  if (game.phase === "over" || !you) return null;
  const yourTurn = you.team === game.turn;

  if (game.phase === "clue" && yourTurn && you.role === "spymaster") {
    const send = async () => {
      setSending(true);
      const ok = await act({ type: "giveClue", word, count });
      setSending(false);
      if (ok) setWord("");
    };
    return (
      <div className="actionbar">
        <input
          className="input"
          value={word}
          onChange={(e) => setWord(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && word && send()}
          placeholder="Sua dica"
          aria-label="Palavra da dica"
          maxLength={30}
        />
        <div className="counts" role="radiogroup" aria-label="Quantas cartas">
          {COUNTS.map((n) => (
            <button key={String(n)} role="radio" aria-checked={count === n} className={`count-btn ${count === n ? "on" : ""}`} onClick={() => setCount(n)}>
              {n === null ? "∞" : n}
            </button>
          ))}
        </div>
        <button className={`btn btn-${game.turn}`} onClick={send} disabled={!word || sending}>
          {sending ? "Enviando…" : "Enviar dica"}
        </button>
      </div>
    );
  }

  if (game.phase === "guess" && yourTurn && you.role === "agent") {
    return (
      <div className="actionbar">
        <p className="actionbar-note">
          {game.guessesMade === 0 ? "Revele pelo menos uma carta antes de passar a vez." : "Acertou! Pode continuar ou passar a vez."}
        </p>
        <button className="btn btn-ghost" onClick={() => act({ type: "endTurn" })} disabled={game.guessesMade === 0}>
          Encerrar a vez
        </button>
      </div>
    );
  }

  if (!you.team) {
    return (
      <div className="actionbar">
        <p className="actionbar-note">Você está assistindo. Entre num time pelos painéis laterais.</p>
      </div>
    );
  }

  return null;
}
