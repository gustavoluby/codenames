import { ASSASSIN_LABEL, NEUTRAL_LABEL } from "@/lib/config";
import type { Action, CardView, RoomView } from "@/lib/types";
import type { CSSProperties } from "react";

const longest = (s: string) => Math.max(6, ...s.split(/\s+/).map((w) => w.length));

export default function Board({ room, act }: { room: RoomView; act: (a: Action) => Promise<boolean> }) {
  const game = room.game!;
  const you = room.you;
  const canGuess = game.phase === "guess" && you?.role === "agent" && you.team === game.turn;
  const over = game.phase === "over";
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";

  const stampFor = (c: CardView) =>
    c.color === "neutral" ? NEUTRAL_LABEL : c.color === "assassin" ? ASSASSIN_LABEL : c.color ? room.settings.teamNames[c.color] : "";

  return (
    <div className="board" role="grid" aria-label="Tabuleiro">
      {game.cards.map((card, i) => {
        const mine = you ? card.marks.includes(you.id) : false;
        const classes = ["card"];
        if (card.revealed) {
          classes.push("revealed", `rev-${card.color}`);
        } else if (card.color) {
          classes.push(`key-${card.color}`); // espião-mestre ou fim de jogo
        }
        if (canGuess && !card.revealed) classes.push("clickable");
        if (mine) classes.push("marked-by-me");
        if (over && card.revealed) classes.push("faded");

        const style = { "--len": longest(card.word), "--slen": longest(stampFor(card)) } as CSSProperties;
        const content = (
          <>
            <span className="card-word">{card.word}</span>
            {card.revealed && <span className="stamp">{stampFor(card)}</span>}
            {!card.revealed && card.marks.length > 0 && (
              <span className="marks">
                {card.marks.map((id) => (
                  <span key={id} className="mark">{nameOf(id)}</span>
                ))}
              </span>
            )}
          </>
        );

        if (!canGuess || card.revealed) {
          return (
            <div key={i} className={classes.join(" ")} style={style} role="gridcell" title={card.revealedBy ? `Revelada por ${card.revealedBy}` : undefined}>
              {content}
            </div>
          );
        }

        return (
          <div
            key={i}
            className={classes.join(" ")}
            style={style}
            role="gridcell"
            tabIndex={0}
            aria-label={`${card.word}${mine ? ", marcada por você" : ""}`}
            onClick={() => act({ type: "toggleMark", index: i })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                act({ type: "toggleMark", index: i });
              }
            }}
          >
            {content}
            <button
              className="reveal-btn"
              onClick={(e) => {
                e.stopPropagation();
                act({ type: "reveal", index: i });
              }}
            >
              Revelar
            </button>
          </div>
        );
      })}
    </div>
  );
}
