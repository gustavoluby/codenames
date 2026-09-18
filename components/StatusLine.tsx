import type { RoomView } from "@/lib/types";

export default function StatusLine({ room }: { room: RoomView }) {
  const game = room.game!;
  const names = room.settings.teamNames;
  const you = room.you;
  const turnName = names[game.turn];
  const yourTurn = you?.team === game.turn;

  if (game.phase === "over") return <div className="status" />;

  if (game.phase === "clue") {
    const hint =
      yourTurn && you?.role === "spymaster"
        ? "Sua vez: dê uma dica de uma palavra e diga quantas cartas ela conecta."
        : yourTurn
          ? "Espere a dica do seu espião-mestre."
          : you?.team
            ? "O espião-mestre deles está pensando na dica."
            : "O espião-mestre está pensando na dica.";
    return (
      <div className="status" aria-live="polite">
        <p className="status-main" key={game.turn}>
          Vez de <span className={`t-${game.turn}`}>{turnName}</span>
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
      ? "Clique numa carta para votar. Quando o time concordar, passe o mouse e clique no ✓ do canto."
      : yourTurn
        ? "Seu time está adivinhando. Nada de dar pistas com a cara!"
        : `${turnName} está adivinhando.`;

  return (
    <div className="status" aria-live="polite">
      <p className="status-main" key={game.turn}>
        Vez de <span className={`t-${game.turn}`}>{turnName}</span>
      </p>
      <span className="status-clue" key={`${clue.word}-${clue.count}`}>
        <span className="status-clue-label">Dica</span>
        {clue.word}
        <span className="n" aria-label={clue.count === null ? "ilimitado" : `${clue.count} cartas`}>{clue.count === null ? "∞" : clue.count}</span>
      </span>
      <p className="status-hint">
        {left !== null ? `${left} ${left === 1 ? "palpite restante" : "palpites restantes"}. ` : "Palpites ilimitados. "}
        {hint}
      </p>
    </div>
  );
}
