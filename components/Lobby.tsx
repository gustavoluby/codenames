"use client";

import { useEffect, useState } from "react";
import { WORD_PACKS, buildWordPool } from "@/lib/words";
import type { Action, RoomView, Team } from "@/lib/types";

export default function Lobby({ room, act, isHost }: { room: RoomView; act: (a: Action) => Promise<boolean>; isHost: boolean }) {
  const s = room.settings;
  const [custom, setCustom] = useState(s.customWords.join("\n"));
  const [names, setNames] = useState(s.teamNames);

  // Sincroniza quando outra pessoa (o admin) altera
  useEffect(() => setCustom(s.customWords.join("\n")), [s.customWords.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setNames(s.teamNames), [s.teamNames.blue, s.teamNames.red]); // eslint-disable-line react-hooks/exhaustive-deps

  const poolSize = new Set(buildWordPool(s.packs, s.customWords).map((w) => w.trim().toUpperCase())).size;
  const missing = (["blue", "red"] as Team[]).flatMap((t) => {
    const m = room.players.filter((p) => p.team === t);
    const out: string[] = [];
    if (!m.some((p) => p.role === "spymaster")) out.push(`${s.teamNames[t]} está sem espião-mestre`);
    if (!m.some((p) => p.role === "agent")) out.push(`${s.teamNames[t]} está sem agentes`);
    return out;
  });

  const togglePack = (id: string) => {
    const packs = s.packs.includes(id) ? s.packs.filter((p) => p !== id) : [...s.packs, id];
    act({ type: "updateSettings", settings: { packs } });
  };

  const saveCustom = () => {
    const words = custom.split(/[\n,;]+/).map((w) => w.trim()).filter(Boolean);
    act({ type: "updateSettings", settings: { customWords: words } });
  };

  const start = () => {
    if (missing.length && !confirm(`${missing.join(". ")}. Começar mesmo assim?`)) return;
    act({ type: "startGame" });
  };

  return (
    <section className="lobby" aria-label="Preparar partida">
      <div className="stack">
        <h2>Preparar partida</h2>
        <p>
          {isHost
            ? "Mande o link da sala para o time. Cada pessoa escolhe um lado nos painéis e você começa quando todos estiverem posicionados."
            : "Escolha seu time e função nos painéis laterais. O admin da sala começa a partida."}
        </p>
      </div>

      <div className="stack">
        <span className="field-label">Pacotes de palavras ({poolSize} palavras)</span>
        <div className="packs">
          {WORD_PACKS.map((pack) => {
            const on = s.packs.includes(pack.id);
            return (
              <button key={pack.id} className={`pack ${on ? "on" : ""}`} onClick={() => togglePack(pack.id)} disabled={!isHost} aria-pressed={on}>
                <strong>{pack.name}</strong>
                <span>{pack.description} · {pack.words.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="two">
        {(["blue", "red"] as Team[]).map((t) => (
          <div key={t}>
            <label className="field-label" htmlFor={`name-${t}`}>Nome do time {t === "blue" ? "azul" : "verde"}</label>
            <input
              id={`name-${t}`}
              className="input"
              value={names[t]}
              maxLength={18}
              disabled={!isHost}
              onChange={(e) => setNames({ ...names, [t]: e.target.value })}
              onBlur={() => act({ type: "updateSettings", settings: { teamNames: names } })}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="field-label" htmlFor="custom">Palavras extras (uma por linha)</label>
        <textarea id="custom" className="input" value={custom} disabled={!isHost} onChange={(e) => setCustom(e.target.value)} onBlur={saveCustom} placeholder="Ex.: piada interna da última reunião" />
      </div>

      {isHost && (
        <>
          {missing.length > 0 && <div className="warn">{missing.join(". ")}.</div>}
          <div className="row" style={{ flexWrap: "wrap", justifyContent: "space-between" }}>
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => act({ type: "randomizeTeams" })}>Sortear times</button>
              <button className="btn btn-ghost btn-sm" onClick={() => act({ type: "resetTeams" })}>Limpar times</button>
            </div>
            <button className="btn" onClick={start} disabled={poolSize < 25}>Começar partida</button>
          </div>
        </>
      )}
    </section>
  );
}
