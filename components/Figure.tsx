// Silhuetas originais do jogo (nada de arte de jogos comerciais).
// Pintadas com currentColor + --fig-detail para funcionar em qualquer carta ou painel.

export type FigureKind = "agent" | "spymaster" | "civilian" | "churn";

export default function Figure({ kind, className }: { kind: FigureKind; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 140" aria-hidden focusable="false">
      {kind === "agent" && <Agent />}
      {kind === "spymaster" && <Spymaster />}
      {kind === "civilian" && <Civilian />}
      {kind === "churn" && <Churn />}
    </svg>
  );
}

const detail = { fill: "var(--fig-detail, rgba(0,0,0,.45))" };
const shine = { fill: "var(--fig-shine, rgba(255,255,255,.18))" };
const face = { fill: "var(--fig-face, currentColor)" };

function Agent() {
  return (
    <g fill="currentColor">
      {/* sobretudo com gola alta */}
      <path d="M4 140c2-26 14-40 34-46l8-4 14 26 14-26 8 4c20 6 32 20 34 46Z" />
      <path {...detail} d="M46 90l14 26 14-26-4-2-10 10-10-10Z" />
      <path {...shine} d="M52 94h16l-2 6 4 22-10 12-10-12 4-22Z" />
      <path d="M57 98h6l3 20-6 8-6-8Z" />
      <rect {...face} x="51" y="70" width="18" height="22" rx="6" />
      <ellipse {...face} cx="60" cy="58" rx="18" ry="21" />
      {/* chapéu */}
      <ellipse cx="60" cy="41" rx="34" ry="6.5" />
      <path d="M39 41c-1-17 6-25 21-25s22 8 21 25Z" />
      <rect {...detail} x="39" y="33" width="42" height="5" />
      {/* óculos escuros */}
      <rect {...detail} x="43" y="54" width="15" height="7.5" rx="3.5" />
      <rect {...detail} x="62" y="54" width="15" height="7.5" rx="3.5" />
      <rect {...detail} x="57" y="56" width="6" height="2" />
    </g>
  );
}

function Spymaster() {
  return (
    <g fill="currentColor">
      {/* cabelo chanel por trás */}
      <path d="M33 62c-4-30 9-45 27-45s31 15 27 45c-1 13-3 22-8 27H41c-5-5-7-14-8-27Z" />
      <path d="M4 140c2-25 14-39 33-45l9-4 14 22 14-22 9 4c19 6 31 20 33 45Z" />
      <path {...detail} d="M44 92l16 22 16-22-6-3-10 11-10-11Z" />
      <rect {...face} x="52" y="72" width="16" height="20" rx="6" />
      <ellipse {...face} cx="60" cy="57" rx="17" ry="20.5" />
      {/* franja */}
      <path d="M41 55c1-19 12-27 25-24 10 3 15 11 14 24-9-9-24-11-39 0Z" />
      <rect {...detail} x="44" y="55" width="14" height="7" rx="3.5" />
      <rect {...detail} x="62" y="55" width="14" height="7" rx="3.5" />
      <rect {...detail} x="57" y="57" width="6" height="2" />
      <path {...shine} d="M46 57h5l-2 3h-3Z" />
      <path {...shine} d="M64 57h5l-2 3h-3Z" />
    </g>
  );
}

function Civilian() {
  return (
    <g fill="currentColor">
      <path d="M8 140c3-24 16-37 34-42l18 10 18-10c18 5 31 18 34 42Z" />
      <path {...detail} d="M44 98l16 9 16-9-3-2-13 6-13-6Z" />
      <rect {...face} x="51" y="72" width="18" height="22" rx="6" />
      <ellipse {...face} cx="60" cy="56" rx="18" ry="21" />
      <path d="M42 50c0-15 8-22 18-22s19 6 18 22c-5-7-11-9-18-9s-13 2-18 9Z" />
    </g>
  );
}

function Churn() {
  return (
    <g fill="currentColor">
      {/* capuz */}
      <path d="M2 140c4-30 14-46 26-56 2-40 16-66 32-66s30 26 32 66c12 10 22 26 26 56Z" />
      <path {...detail} d="M36 80c0-30 10-48 24-48s24 18 24 48c-6 10-14 16-24 16s-18-6-24-16Z" />
      <path fill="var(--fig-eyes, #ff4d4d)" d="M45 64l12 3-1 4-12-2Z" />
      <path fill="var(--fig-eyes, #ff4d4d)" d="M75 64l-12 3 1 4 12-2Z" />
    </g>
  );
}
