import { Crown, KeyRound, Plus, UserRound, Users } from "lucide-react";
import type { Role, RoomView, Team } from "@/lib/types";
import Figure from "./Figure";

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
  const isTurn = !!game && game.phase !== "over" && game.turn === team;
  const activeRole: Role | null = isTurn ? (game!.phase === "clue" ? "spymaster" : "agent") : null;

  const roleBlock = (role: Role, label: string) => {
    const people = members.filter((p) => p.role === role);
    const Icon = role === "spymaster" ? KeyRound : Users;
    return (
      <div className={`role-box ${activeRole === role ? "is-active" : ""}`}>
        <div className="role-head">
          <h3 className="role-title"><Icon aria-hidden /> {label}</h3>
          {people.length > 0 && <span className="role-count">{people.length}</span>}
        </div>
        {people.length === 0 ? (
          <div className="slots">
            <span className="slot"><UserRound aria-hidden /></span>
            <span className="slot"><UserRound aria-hidden /></span>
            <span>Ninguém ainda</span>
          </div>
        ) : (
          <ul className="people" role="list">
            {people.map((p) => (
              <li key={p.id} className={`person ${p.id === room.you?.id ? "me" : ""}`}>
                <span className="avatar" aria-hidden>
                  {p.name.trim().charAt(0) || "?"}
                  <span className={`dot ${Date.now() - (presence[p.id] ?? 0) < ONLINE_MS ? "on" : ""}`} />
                </span>
                <span className="person-name">{p.name}{p.id === room.you?.id ? " (você)" : ""}</span>
                {p.id === room.hostId && <Crown className="host" aria-label="Admin da sala" />}
              </li>
            ))}
          </ul>
        )}
        {room.you && !room.you.team && (
          <button className="btn-join" onClick={() => onJoin(role)}>
            <Plus aria-hidden strokeWidth={2.5} /> Entrar como {role === "spymaster" ? "espião-mestre" : "agente"}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className={`team team-${team} ${isTurn ? "is-turn" : ""}`} aria-label={`Time ${name}`}>
      <div className="team-hero">
        <Figure kind={team === "blue" ? "agent" : "spymaster"} className="hero-figure" />
        <div>
          <h2 className="team-name">{name}</h2>
          {isTurn && <span className="stamp-type team-turn">Na vez</span>}
        </div>
        {remaining !== null ? (
          <div className="team-count">
            <strong>{remaining}</strong>
            <span>{remaining === 1 ? "agente" : "agentes"}<br />{remaining === 1 ? "restante" : "restantes"}</span>
          </div>
        ) : (
          <div className="team-count">
            <strong>{members.length}</strong>
            <span>{members.length === 1 ? "jogador" : "jogadores"}<br />no time</span>
          </div>
        )}
      </div>
      {roleBlock("spymaster", "Espião-mestre")}
      {roleBlock("agent", "Agentes")}
    </section>
  );
}
