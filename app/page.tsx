"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GAME_NAME, GAME_TAGLINE } from "@/lib/config";
import { createRoomRequest, loadIdentity, saveIdentity, type Identity } from "@/lib/client";
import { cleanRoomCode } from "@/lib/code";

// Grade decorativa: um tabuleiro 5x5 abstrato
const DECK = "bnrbanrnbrrbnbnrbnrbrnbrb".split("");

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
        <div>
          <h1 className="home-title">{GAME_NAME}</h1>
          <p className="home-sub">{GAME_TAGLINE}. Um espião-mestre dá a dica, o time adivinha as palavras. Cuidado com o Churn.</p>
        </div>
        <div className="home-deck" aria-hidden>
          {DECK.map((c, i) => (
            <div key={i} className={`mini ${c}`} />
          ))}
        </div>
      </section>

      <section className="home-form">
        <div className="stack">
          <h2>Criar uma sala</h2>
          <div>
            <label className="field-label" htmlFor="name">Seu apelido</label>
            <input id="name" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="Ex.: Luby" />
          </div>
          <button className="btn" onClick={create} disabled={busy || !identity}>
            {busy ? "Criando sala…" : "Criar sala"}
          </button>
        </div>

        <div className="divider" />

        <div className="stack">
          <h2>Entrar numa sala</h2>
          <div className="row">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join()} placeholder="Código da sala" aria-label="Código da sala" style={{ textTransform: "uppercase", letterSpacing: "0.12em" }} />
            <button className="btn btn-ghost" onClick={join}>Entrar</button>
          </div>
          <p className="field-label" style={{ fontWeight: 400, color: "var(--ink-soft)" }}>Ou abra o link que alguém mandou no chat.</p>
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}
      </section>
    </main>
  );
}
