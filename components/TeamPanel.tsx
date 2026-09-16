import type { Role, RoomView, Team } from "@/lib/types";

const ONLINE_MS = 30_000;

export default function TeamPanel({
  team, room, presence, onJoin,
}: { team: Team; room: RoomView; presence: Record<string, number>; onJoin: (role: Role) => void }) {
  const game = room.game;
  const name = room.settings.teamNames[team];
  const members = room.players.filter((p) => p.team === team);
  const total = game ? (game.startingTeam === team ? 9 : 8) : 0;
  const revealed = game ? game.cards.filter((c) => c.revealed && c.color === team).length : 0;
  const remaining = game ? total - revealed : null;

  const roleBlock = (role: Role, label: string) => {
    const people = members.filter((p) => p.role === role);
    const isYou = room.you?.team === team && room.you?.role === role;
    return (
      <div>
        <p className="role-title">{label}</p>
        <div className="people">
          {people.length === 0 && <span className="empty">Ninguém ainda</span>}
          {people.map((p) => (
            <span key={p.id} className={`person ${p.id === room.you?.id ? "me" : ""}`}>
              <span className={`dot ${Date.now() - (presence[p.id] ?? 0) < ONLINE_MS ? "on" : ""}`} aria-hidden />
              {p.name}
              {p.id === room.hostId && <span title="Admin da sala" aria-label="admin">★</span>}
            </span>
          ))}
        </div>
        {!isYou && (
          <button className="join-link" onClick={() => onJoin(role)} style={{ marginTop: "0.4rem" }}>
            Entrar como {role === "spymaster" ? "espião-mestre" : "agente"}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className={`team team-${team} ${game && game.phase !== "over" && game.turn === team ? "is-turn" : ""}`} aria-label={`Time ${name}`}>
      <div className="team-head">
        <h2 className="team-name">{name}</h2>
        {remaining !== null && (
          <div className="team-count">
            {remaining}
            <small>{remaining === 1 ? "falta" : "faltam"}</small>
          </div>
        )}
      </div>
      <div className="team-body">
        {roleBlock("spymaster", "Espião-mestre")}
        {roleBlock("agent", "Agentes")}
      </div>
    </section>
  );
}
