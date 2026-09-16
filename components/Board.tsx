import { Check } from "lucide-react";
import { ASSASSIN_LABEL, NEUTRAL_LABEL } from "@/lib/config";
import type { Action, CardView, RoomView } from "@/lib/types";
import CardFace, { cardClasses, cardStyle } from "./CardFace";

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
        const classes = cardClasses(card.color, card.revealed); // cor sem revelar = espião-mestre ou fim de jogo
        if (canGuess && !card.revealed) classes.push("clickable");
        if (mine) classes.push("marked-by-me");
        if (over && card.revealed) classes.push("faded");

        const stamp = card.revealed ? stampFor(card) : "";
        const marks = !card.revealed && card.marks.length > 0 && (
          <span className="marks">
            {card.marks.map((id) => (
              <span key={id} className="mark">{nameOf(id)}</span>
            ))}
          </span>
        );

        if (!canGuess || card.revealed) {
          return (
            <div
              key={i}
              className={classes.join(" ")}
              style={cardStyle(card.word, stamp)}
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
            style={cardStyle(card.word)}
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
            <CardFace word={card.word} color={card.color} revealed={false}>
              {marks}
              <button
                className="reveal-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  act({ type: "reveal", index: i });
                }}
              >
                <Check strokeWidth={3} aria-hidden /> Revelar
              </button>
            </CardFace>
          </div>
        );
      })}
    </div>
  );
}
