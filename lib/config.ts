// Tudo que é "marca" do jogo mora aqui — renomear o jogo ou os times é só mexer neste arquivo.
export const GAME_NAME = "Lead Secreto";
export const GAME_TAGLINE = "O jogo de dicas e palavras do time Leadster";

export const DEFAULT_TEAM_NAMES = { blue: "Pagode", red: "Sertanejo" } as const;

// Nome que aparece no carimbo das cartas reveladas que não são de time.
export const NEUTRAL_LABEL = "Lead frio";
export const ASSASSIN_LABEL = "Churn";

export const ROOM_TTL_SECONDS = 60 * 60 * 24; // salas somem 24h depois da última ação
export const POLL_INTERVAL_MS = 1200;
export const PRESENCE_EVERY_MS = 10_000;
export const HOST_TIMEOUT_MS = 45_000; // depois disso, qualquer um pode assumir o admin

// Subcaminho onde o jogo está publicado ("" na raiz do domínio, "/codenames" num subcaminho).
// Link e router do Next já aplicam sozinhos; fetch e window.location precisam deste prefixo.
const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
export const BASE_PATH = rawBasePath ? `/${rawBasePath}` : "";
