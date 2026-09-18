"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Vote } from "lucide-react";
import { ASSASSIN_LABEL, NEUTRAL_LABEL } from "@/lib/config";
import type { Action, CardView, RoomView } from "@/lib/types";
import CardFace, { cardClasses, cardStyle } from "./CardFace";

export default function Board({ room, act }: { room: RoomView; act: (a: Action) => Promise<boolean> }) {
  const game = room.game!;
  const you = room.you;
  const canGuess = game.phase === "guess" && you?.role === "agent" && you.team === game.turn;
  const over = game.phase === "over";
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";
  const fx = useCardFx(game.cards);
  const dealing = useDealing(game.cards);

  const stampFor = (c: CardView) =>
    c.color === "neutral" ? NEUTRAL_LABEL : c.color === "assassin" ? ASSASSIN_LABEL : c.color ? room.settings.teamNames[c.color] : "";

  return (
    <div className={`board ${dealing ? "dealing" : ""}`} role="grid" aria-label="Tabuleiro">
      {game.cards.map((card, i) => {
        const mine = you ? card.marks.includes(you.id) : false;
        const classes = cardClasses(card.color, card.revealed); // cor sem revelar = espião-mestre ou fim de jogo
        if (canGuess && !card.revealed) classes.push("clickable");
        if (mine) classes.push("marked-by-me");
        if (over && card.revealed) classes.push("faded");
        if (fx[i]) classes.push(fx[i]);

        const stamp = card.revealed ? stampFor(card) : "";
        // Até 3 nomes; com mais votos mostra 2 + "+N" para não cobrir a palavra
        const shown = card.marks.length > 3 ? card.marks.slice(0, 2) : card.marks;
        const hiddenVotes = card.marks.length - shown.length;
        const marks = !card.revealed && card.marks.length > 0 && (
          <span className="marks" title={card.marks.map(nameOf).join(", ")}>
            {shown.map((id) => (
              <span key={id} className="mark"><Vote aria-hidden /> {nameOf(id)}</span>
            ))}
            {hiddenVotes > 0 && <span className="mark">+{hiddenVotes}</span>}
          </span>
        );

        if (!canGuess || card.revealed) {
          return (
            <div
              key={i}
              className={classes.join(" ")}
              style={{ ...cardStyle(card.word, stamp), "--i": i } as CSSProperties}
              role="gridcell"
              aria-label={card.revealed ? `${card.word}, ${stamp}` : card.word}
              title={card.revealedBy ? `Revelada por ${card.revealedBy}` : undefined}
            >
              <CardFace word={card.word} color={card.color} revealed={card.revealed} stamp={stamp}>{marks}</CardFace>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={classes.join(" ")}
            style={{ ...cardStyle(card.word), "--i": i } as CSSProperties}
            role="gridcell"
            tabIndex={0}
            aria-label={`${card.word}${card.marks.length ? `, votos: ${card.marks.map(nameOf).join(", ")}` : ""}. Enter para votar.`}
            onClick={() => act({ type: "toggleMark", index: i })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                act({ type: "toggleMark", index: i });
              }
            }}
          >
            <CardFace word={card.word} color={card.color} revealed={false}>
              {marks}
              <button
                className="reveal-btn"
                aria-label={`Votar pelo seu time: revelar ${card.word}`}
                onClick={(e) => {
                  e.stopPropagation();
                  act({ type: "reveal", index: i });
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Check strokeWidth={3.5} aria-hidden />
                <span className="reveal-tip" aria-hidden>Votar pelo seu time</span>
              </button>
            </CardFace>
          </div>
        );
      })}
    </div>
  );
}

const FX_MS = 1100;

/** Marca por ~1s as cartas que acabaram de ser reveladas ou votadas, para a mudança não passar batida. */
function useCardFx(cards: CardView[]) {
  const [fx, setFx] = useState<Record<number, string>>({});
  const prev = useRef<{ revealed: boolean[]; marks: string[] } | null>(null);

  useEffect(() => {
    const snap = { revealed: cards.map((c) => c.revealed), marks: cards.map((c) => c.marks.join(",")) };
    const before = prev.current;
    prev.current = snap;
    if (!before) return;

    const next: Record<number, string> = {};
    snap.revealed.forEach((revealed, i) => {
      if (revealed && !before.revealed[i]) next[i] = "just-revealed";
      else if (!revealed && snap.marks[i] !== before.marks[i] && snap.marks[i].length > (before.marks[i]?.length ?? 0)) next[i] = "just-voted";
    });
    const keys = Object.keys(next);
    if (keys.length === 0) return;

    setFx((current) => ({ ...current, ...next }));
    const t = setTimeout(
      () => setFx((current) => {
        const rest = { ...current };
        keys.forEach((k) => delete rest[Number(k)]);
        return rest;
      }),
      FX_MS,
    );
    return () => clearTimeout(t);
  }, [cards]);

  return fx;
}

const DEAL_MS = 1200;

/** Baralho novo (ou tabuleiro recém-aberto): cartas caem espalhadas na mesa, uma depois da outra. */
function useDealing(cards: CardView[]) {
  const words = cards.map((c) => c.word).join("|");
  const [dealing, setDealing] = useState(true);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current === words) return;
    prev.current = words;
    setDealing(true);
    const t = setTimeout(() => setDealing(false), DEAL_MS);
    return () => clearTimeout(t);
  }, [words]);

  return dealing;
}
