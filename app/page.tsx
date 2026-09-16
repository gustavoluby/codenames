"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";
import { GAME_NAME, GAME_TAGLINE, ASSASSIN_LABEL } from "@/lib/config";
import { createRoomRequest, loadIdentity, saveIdentity, type Identity } from "@/lib/client";
import { cleanRoomCode } from "@/lib/code";
import CardFace, { cardClasses, cardStyle } from "@/components/CardFace";
import type { CardColor } from "@/lib/types";

const [TITLE_FIRST, ...TITLE_REST] = GAME_NAME.split(" ");

// Cartas espalhadas na mesa da home (só decoração)
const SCENE: { word: string; color: CardColor | null; revealed: boolean; stamp?: string }[] = [
  { word: "Funil", color: null, revealed: false },
  { word: "WhatsApp", color: "blue", revealed: true, stamp: "Agente" },
  { word: "Pipeline", color: null, revealed: false },
  { word: "Lead", color: null, revealed: false },
];

export default function Home() {
  const router = useRouter();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = loadIdentity();
    setIdentity(id);
    setName(id.name);
  }, []);

  async function create() {
    if (!identity) return;
    if (!name.trim()) return setError("Digite um apelido para criar a sala.");
    setBusy(true);
    setError(null);
    try {
      saveIdentity({ ...identity, name: name.trim() });
      const { code } = await createRoomRequest(name.trim(), identity.id);
      router.push(`/sala/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu para criar a sala.");
      setBusy(false);
    }
  }

  function join() {
    const c = cleanRoomCode(code);
    if (c.length < 4) return setError("Digite o código da sala (5 letras).");
    if (identity && name.trim()) saveIdentity({ ...identity, name: name.trim() });
    router.push(`/sala/${c}`);
  }

  return (
    <main className="home">
      <section className="home-hero">
        <h1 className="home-title">
          <span>{TITLE_FIRST}</span>
          {TITLE_REST.length > 0 && <em>{TITLE_REST.join(" ")}</em>}
        </h1>
        <p className="home-sub">
          {GAME_TAGLINE}. Um espião-mestre dá a dica, o time descobre os agentes escondidos no tabuleiro. Só não encosta no {ASSASSIN_LABEL}.
        </p>
        <div className="scene" aria-hidden>
          {SCENE.map((c, i) => (
            <div key={c.word} className={`${cardClasses(c.color, c.revealed).join(" ")} s${i + 1}`} style={cardStyle(c.word, c.stamp)}>
              <CardFace word={c.word} color={c.color} revealed={c.revealed} stamp={c.stamp} />
            </div>
          ))}
          <span className="stamp-type scene-stamp">Confidencial</span>
        </div>
      </section>

      <section className="dossier" aria-label="Entrar no jogo">
        <span className="stamp-type dossier-tab">Missão da call</span>

        <div className="stack">
          <h2>Criar uma sala</h2>
          <div>
            <label className="field-label" htmlFor="name">Seu apelido</label>
            <div className="input-icon">
              <UserRound aria-hidden />
              <input id="name" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Ex.: Luby" autoComplete="nickname" />
            </div>
          </div>
          <button className="btn btn-gold btn-lg btn-block" onClick={create} disabled={busy || !identity}>
            {busy ? "Criando sala…" : <>Criar sala <ArrowRight aria-hidden /></>}
          </button>
        </div>

        <div className="or-line">ou entre numa sala</div>

        <div className="stack">
          <div className="row">
            <div className="input-icon grow">
              <KeyRound aria-hidden />
              <input className="input code-input" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} placeholder="Código" aria-label="Código da sala" maxLength={8} />
            </div>
            <button className="btn btn-ghost btn-field" onClick={join}>Entrar</button>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>

        <ol className="steps">
          <li>Crie a sala com seu apelido.</li>
          <li>Copie o link e mande no chat da call.</li>
          <li>Cada pessoa escolhe time e função.</li>
          <li>O admin começa a partida. Boa missão!</li>
        </ol>
      </section>
    </main>
  );
}
