"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ASSASSIN_LABEL, NEUTRAL_LABEL } from "@/lib/config";

export default function RulesDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-ghost dialog-close" onClick={onClose} aria-label="Fechar"><X aria-hidden /></button>
        <h2 id="rules-title">Como jogar</h2>
        <p>Dois times disputam quem encontra primeiro todos os seus agentes escondidos entre as 25 palavras do tabuleiro.</p>
        <ul>
          <li>Cada time tem um <strong>espião-mestre</strong>, que vê a cor de todas as cartas, e <strong>agentes</strong>, que não veem nada.</li>
          <li><strong>Escolheu time e função, não troca mais</strong> nesta sala, nem saindo e voltando. Assim ninguém espia o gabarito e muda de lado.</li>
          <li>O time que começa tem 9 cartas; o outro, 8. Há 7 cartas de {NEUTRAL_LABEL} e 1 carta de {ASSASSIN_LABEL}.</li>
          <li>Na sua vez, o espião-mestre dá uma dica de uma palavra só e um número: quantas cartas ela conecta. A dica não pode ser uma palavra que ainda está no tabuleiro.</li>
          <li>Os agentes conversam, marcam palpites clicando nas cartas e usam Revelar quando decidirem. Podem fazer até número + 1 palpites (0 ou ∞ liberam palpites ilimitados), sempre pelo menos um.</li>
          <li>Carta do próprio time: pode continuar. {NEUTRAL_LABEL} ou carta do adversário: a vez passa. <strong>{ASSASSIN_LABEL}: o time perde na hora.</strong></li>
          <li>Vence quem tiver todas as suas cartas reveladas, mesmo que o adversário revele a última por engano.</li>
          <li>Espião-mestre não pode dar pistas por gesto, cara ou comentário durante os palpites.</li>
        </ul>
        <button className="btn btn-gold" onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
