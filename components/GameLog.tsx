import type { RoomView } from "@/lib/types";

export default function GameLog({ room }: { room: RoomView }) {
  if (room.log.length === 0) return null;
  return (
    <section className="log" aria-label="Registro da partida">
      <h3>Registro</h3>
      <ol>
        {[...room.log].reverse().map((entry, i) => (
          <li key={`${entry.at}-${i}`} className={`k-${entry.kind} ${entry.team ? `l-${entry.team}` : ""}`}>
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
