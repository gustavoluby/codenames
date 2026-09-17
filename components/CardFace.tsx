import type { CSSProperties, ReactNode } from "react";
import type { CardColor } from "@/lib/types";
import Figure, { type FigureKind } from "./Figure";

const FIGURE: Record<CardColor, FigureKind> = { blue: "agent", red: "spymaster", neutral: "civilian", assassin: "churn" };

export const longest = (s: string) => Math.max(6, ...s.split(/\s+/).map((w) => w.length));

/** Classes da carta conforme o que o jogador pode ver. */
export function cardClasses(color: CardColor | null, revealed: boolean) {
  if (revealed && color) return ["card", "revealed", `rev-${color}`];
  if (color) return ["card", `key-${color}`];
  return ["card"];
}

export function cardStyle(word: string, stamp = "") {
  return { "--len": longest(word), "--slen": longest(stamp) } as CSSProperties;
}

/** Miolo da carta: faixa com a palavra e, se revelada, a silhueta + carimbo. */
export default function CardFace({ word, color, revealed, stamp, children }: {
  word: string;
  color: CardColor | null;
  revealed: boolean;
  stamp?: string;
  children?: ReactNode;
}) {
  return (
    <>
      {revealed && color && (
        <>
          <Figure kind={FIGURE[color]} className="card-figure" />
          {stamp && <span className="stamp-type card-stamp">{stamp}</span>}
        </>
      )}
      <span className="card-band">
        <span className="card-word">{word}</span>
      </span>
      {children}
    </>
  );
}
