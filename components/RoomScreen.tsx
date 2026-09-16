"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BASE_PATH, GAME_NAME, HOST_TIMEOUT_MS } from "@/lib/config";
import { loadIdentity, saveIdentity, useRoom, type Identity } from "@/lib/client";
import type { Team } from "@/lib/types";
import ActionBar from "./ActionBar";
import Board from "./Board";
import GameLog from "./GameLog";
import Lobby from "./Lobby";
import RulesDialog from "./RulesDialog";
import StatusLine from "./StatusLine";
import TeamPanel from "./TeamPanel";

export default function RoomScreen({ code }: { code: string }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  useEffect(() => setIdentity(loadIdentity()), []);
  const { room, presence, notFound, toast, setToast, act } = useRoom(code, identity?.id ?? null);
  const [showRules, setShowRules] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (identity?.name) setJoinName(identity.name);
  }, [identity]);

  if (notFound) {
    return (
      <main className="centered">
        <div className="join-box">
          <h1>Sala não encontrada</h1>
          <p>O código {code} não existe ou a sala expirou (elas somem 24h depois da última jogada).</p>
          <Link className="btn" href="/">Criar uma sala nova</Link>
        </div>
      </main>
    );
  }

  if (!room || !identity) {
    return <main className="centered"><p>Abrindo a sala {code}…</p></main>;
  }

  if (!room.you) {
    const submit = async () => {
      if (!joinName.trim()) return setToast("Digite um apelido para entrar.");
      setJoining(true);
      const next = { ...identity, name: joinName.trim() };
      saveIdentity(next);
      await act({ type: "join", name: next.name });
      setJoining(false);
    };
    return (
      <main className="centered">
        <div className="join-box">
          <h1>{GAME_NAME}</h1>
          <p>Você foi chamado para a sala {code}. Como o time vai te chamar?</p>
          <div className="stack">
            <input className="input" autoFocus value={joinName} maxLength={24} placeholder="Seu apelido" aria-label="Seu apelido" onChange={(e) => setJoinName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button className="btn" onClick={submit} disabled={joining}>{joining ? "Entrando…" : "Entrar na sala"}</button>
          </div>
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    );
  }

  const you = room.you;
  const isHost = room.hostId === you.id;
  const hostOnline = Date.now() - (presence[room.hostId] ?? Date.now()) < HOST_TIMEOUT_MS;
  const game = room.game;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${BASE_PATH}/sala/${room.code}`);
      setToast("Link da sala copiado.");
    } catch {
      setToast(`Código da sala: ${room.code}`);
    }
  };

  const panel = (team: Team) => (
    <TeamPanel team={team} room={room} presence={presence} onJoin={(role) => act({ type: "setRole", team, role })} />
  );

  return (
    <main className="room">
      <header className="topbar">
        <div className="row" style={{ gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/" className="brand" style={{ color: "inherit", textDecoration: "none" }}>{GAME_NAME}</Link>
          <span className="room-code">
            Sala <strong>{room.code}</strong>
            <button className="btn btn-sm" onClick={copyLink}>Copiar link</button>
          </span>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {you.team && (
            <button className="btn btn-ghost btn-sm" onClick={() => act({ type: "setRole", team: null, role: null })}>Virar espectador</button>
          )}
          {isHost && game && game.phase !== "over" && (
            <button className="btn btn-ghost btn-sm" onClick={() => confirm("Encerrar a partida e voltar ao lobby?") && act({ type: "backToLobby" })}>Encerrar partida</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setShowRules(true)}>Regras</button>
        </div>
      </header>

      {game ? <StatusLine room={room} /> : <div style={{ height: "1.25rem" }} />}

      <div className="layout">
        {panel("blue")}
        <div className="center">
          {game ? (
            <>
              {game.phase === "over" && game.winner && (
                <div className={`gameover team-${game.winner}`}>
                  <h2>{room.settings.teamNames[game.winner]} venceu{game.winReason === "assassin" ? " — o outro time achou o Churn" : ""}!</h2>
                  {isHost ? (
                    <div className="row">
                      <button className="btn" onClick={() => act({ type: "startGame" })}>Nova partida</button>
                      <button className="btn btn-ghost" onClick={() => act({ type: "backToLobby" })}>Voltar ao lobby</button>
                    </div>
                  ) : (
                    <span>Esperando o admin começar outra partida.</span>
                  )}
                </div>
              )}
              <Board room={room} act={act} />
              <ActionBar room={room} act={act} />
            </>
          ) : (
            <Lobby room={room} act={act} isHost={isHost} />
          )}
          <GameLog room={room} />
          <div className="footer-links">
            {!isHost && !hostOnline && (
              <button className="linklike" onClick={() => act({ type: "claimHost" })}>O admin saiu? Assumir o admin</button>
            )}
            <button className="linklike" onClick={() => confirm("Sair da sala?") && act({ type: "leave" }).then(() => (window.location.href = `${BASE_PATH}/`))}>Sair da sala</button>
          </div>
        </div>
        {panel("red")}
      </div>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
