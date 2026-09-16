export type Team = "blue" | "red";
export type Role = "spymaster" | "agent";
export type CardColor = Team | "neutral" | "assassin";

export interface Player {
  id: string;
  name: string;
  team: Team | null;
  role: Role | null;
  joinedAt: number;
}

export interface Card {
  word: string;
  color: CardColor;
  revealed: boolean;
  revealedBy?: string;
  /** ids dos jogadores que marcaram a carta como palpite */
  marks: string[];
}

export interface Clue {
  team: Team;
  word: string;
  /** null = ilimitado (∞) */
  count: number | null;
  by: string;
}

export type Phase = "clue" | "guess" | "over";

export interface Game {
  cards: Card[];
  startingTeam: Team;
  turn: Team;
  phase: Phase;
  clue: Clue | null;
  guessesMade: number;
  winner: Team | null;
  winReason: "agents" | "assassin" | null;
}

export interface LogEntry {
  at: number;
  kind: "clue" | "reveal" | "end_turn" | "win" | "system";
  team?: Team;
  color?: CardColor;
  text: string;
}

export interface Settings {
  packs: string[];
  customWords: string[];
  teamNames: { blue: string; red: string };
}

export interface Room {
  code: string;
  version: number;
  hostId: string;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  settings: Settings;
  game: Game | null;
  log: LogEntry[];
  /** Time e função travados de cada jogador que já escolheu. Sobrevive a sair e voltar para a sala. */
  assignments?: Record<string, { team: Team; role: Role }>;
}

/** Carta como o cliente enxerga: sem cor se o jogador não pode ver o gabarito. */
export interface CardView extends Omit<Card, "color"> {
  color: CardColor | null;
}

export interface RoomView extends Omit<Room, "game" | "assignments"> {
  game: (Omit<Game, "cards"> & { cards: CardView[] }) | null;
  you: Player | null;
}

export type Action =
  | { type: "join"; name: string }
  | { type: "leave" }
  | { type: "setRole"; team: Team; role: Role }
  | { type: "randomizeTeams" }
  | { type: "updateSettings"; settings: Partial<Settings> }
  | { type: "startGame" }
  | { type: "backToLobby" }
  | { type: "claimHost" }
  | { type: "giveClue"; word: string; count: number | null }
  | { type: "toggleMark"; index: number }
  | { type: "reveal"; index: number }
  | { type: "endTurn" };
