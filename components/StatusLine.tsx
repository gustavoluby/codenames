import type { RoomView } from "@/lib/types";

export default function StatusLine({ room }: { room: RoomView }) {
  const game = room.game!;
  const names = room.settings.teamNames;
  const you = room.you;
  const turnName = names[game.turn];
  const yourTurn = you?.team === game.turn;

  if (game.phase === "over") return <div className="status" />;

  if (game.phase === "clue") {
    const hint = yourTurn && you?.role === "spymaster" ? "Sua vez de dar a dica." : yourTurn ? "Espere a dica do seu espião-mestre." : "O outro time está pensando na dica.";
    return (
      <div className="status" aria-live="polite">
        <p className="status-main">
          <span className={`t-${game.turn}`}>{turnName}</span> está pensando na dica
        </p>
        <p className="status-hint">{hint}</p>
      </div>
    );
  }

  const clue = game.clue!;
  const limited = clue.count !== null && clue.count > 0;
  const left = limited ? clue.count! + 1 - game.guessesMade : null;
  const hint =
    yourTurn && you?.role === "agent"
      ? "Clique numa carta para marcar o palpite. Quando o time concordar, use Revelar."
      : yourTurn
        ? "Seu time está adivinhando. Nada de dar pistas com a cara!"
        : `${turnName} está adivinhando.`;

  return (
    <div className="status" aria-live="polite">
      <p className="status-main"><span className={`t-${game.turn}`}>{turnName}</span> recebeu a dica</p>
      <span className="status-clue">
        {clue.word} <span className="n">{clue.count === null ? "∞" : clue.count}</span>
      </span>
      <p className="status-hint">
        {left !== null ? `${left} ${left === 1 ? "palpite restante" : "palpites restantes"}. ` : "Palpites ilimitados. "}
        {hint}
      </p>
    </div>
  );
}
