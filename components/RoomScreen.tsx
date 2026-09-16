"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Copy, Eye, Flag, LogOut, RotateCcw } from "lucide-react";
import { ASSASSIN_LABEL, BASE_PATH, HOST_TIMEOUT_MS } from "@/lib/config";
import { loadIdentity, saveIdentity, useRoom, type Identity } from "@/lib/client";
import type { Team } from "@/lib/types";
import ActionBar from "./ActionBar";
import Board from "./Board";
import Brand from "./Brand";
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
        <div className="dossier join-box">
          <span className="stamp-type dossier-tab">Arquivo morto</span>
          <Brand />
          <div className="stack">
            <h2>Sala não encontrada</h2>
            <p>O código {code} não existe ou a sala expirou (elas somem 24h depois da última jogada).</p>
          </div>
          <Link className="btn btn-gold btn-block" href="/">Criar uma sala nova <ArrowRight aria-hidden /></Link>
        </div>
      </main>
    );
  }

  if (!room || !identity) {
    return <main className="centered"><p className="loading-line">Abrindo a sala {code}…</p></main>;
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
        <div className="dossier join-box">
          <span className="stamp-type dossier-tab">Convocação · {code}</span>
          <Brand />
          <div className="stack">
            <h2>Você foi convocado</h2>
            <p>Uma missão começou na sala {code}. Como o time vai te chamar?</p>
          </div>
          <div className="stack">
            <input className="input" autoFocus value={joinName} maxLength={24} placeholder="Seu apelido" aria-label="Seu apelido" onChange={(e) => setJoinName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button className="btn btn-gold btn-lg btn-block" onClick={submit} disabled={joining}>
              {joining ? "Entrando…" : <>Entrar na sala <ArrowRight aria-hidden /></>}
            </button>
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
      setToast("Link da sala copiado. Cole no chat da call.");
    } catch {
      setToast(`Código da sala: ${room.code}`);
    }
  };

  const panel = (team: Team) => (
    <TeamPanel team={team} room={room} presence={presence} onJoin={(role) => act({ type: "setRole", team, role })} />
  );

  const leave = () => confirm("Sair da sala?") && act({ type: "leave" }).then(() => (window.location.href = `${BASE_PATH}/`));

  return (
    <main className="room">
      <header className="topbar">
        <div className="topbar-left">
          <Brand />
          <span className="room-code">
            Sala <strong>{room.code}</strong>
            <button className="btn btn-ghost" onClick={copyLink}><Copy aria-hidden /> Copiar link</button>
          </span>
        </div>
        <div className="topbar-right">
          {you.team && (
            <button className="btn btn-ghost" onClick={() => act({ type: "setRole", team: null, role: null })}><Eye aria-hidden /> Virar espectador</button>
          )}
          {isHost && game && game.phase !== "over" && (
            <button className="btn btn-ghost" onClick={() => confirm("Encerrar a partida e voltar ao lobby?") && act({ type: "backToLobby" })}><Flag aria-hidden /> Encerrar partida</button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowRules(true)}><BookOpen aria-hidden /> Regras</button>
          <button className="btn btn-ghost" onClick={leave}><LogOut aria-hidden /> Sair</button>
        </div>
      </header>

      {game ? <StatusLine room={room} /> : <div style={{ height: "1.25rem" }} />}

      <div className="layout">
        <div className="side">{panel("blue")}</div>
        <div className="center">
          {game ? (
            <>
              {game.phase === "over" && game.winner && (
                <div className={`gameover team-${game.winner} ${game.winReason === "assassin" ? "lost-assassin" : ""}`}>
                  <div>
                    <h2>{room.settings.teamNames[game.winner]} venceu!</h2>
                    <p>
                      {game.winReason === "assassin"
                        ? `${room.settings.teamNames[game.winner === "blue" ? "red" : "blue"]} revelou o ${ASSASSIN_LABEL}.`
                        : "Todos os agentes foram encontrados."}
                    </p>
                  </div>
                  {isHost ? (
                    <div className="row">
                      <button className="btn btn-gold" onClick={() => act({ type: "startGame" })}><RotateCcw aria-hidden /> Nova partida</button>
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
          {!isHost && !hostOnline && (
            <div className="footer-links">
              <button className="linklike" onClick={() => act({ type: "claimHost" })}>O admin saiu? Assumir o admin</button>
            </div>
          )}
        </div>
        <div className="side">
          {panel("red")}
          <GameLog room={room} />
        </div>
      </div>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
