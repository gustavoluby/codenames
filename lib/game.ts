import { DEFAULT_TEAM_NAMES, ASSASSIN_LABEL, NEUTRAL_LABEL } from "./config";
import type { Action, Card, CardColor, Game, Player, Role, Room, RoomView, Team } from "./types";
import { buildWordPool, DEFAULT_PACKS, WORD_PACKS } from "./words";

export class GameError extends Error {}

export type Rng = () => number;

export interface ActionContext {
  now: number;
  rng: Rng;
  /** true quando o admin atual está offline há mais que HOST_TIMEOUT_MS */
  hostIsStale: boolean;
}

const MAX_LOG = 150;
const MAX_NAME = 24;

export const other = (t: Team): Team => (t === "blue" ? "red" : "blue");

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createRoom(code: string, host: { id: string; name: string }, now: number): Room {
  return {
    code,
    version: 1,
    hostId: host.id,
    createdAt: now,
    updatedAt: now,
    players: [{ id: host.id, name: cleanName(host.name), team: null, role: null, joinedAt: now }],
    settings: { packs: [...DEFAULT_PACKS], customWords: [], teamNames: { ...DEFAULT_TEAM_NAMES } },
    game: null,
    log: [],
  };
}

/** Tabuleiro clássico: 9 do time que começa, 8 do outro, 7 neutras, 1 assassina. */
export function createGame(words: string[], rng: Rng): Game {
  const unique = Array.from(new Map(words.map((w) => [normalize(w), w.trim()])).values()).filter(Boolean);
  if (unique.length < 25) {
    throw new GameError(`São precisas pelo menos 25 palavras diferentes — os pacotes escolhidos têm ${unique.length}.`);
  }
  const picked = shuffle(unique, rng).slice(0, 25);
  const startingTeam: Team = rng() < 0.5 ? "blue" : "red";
  const colors: CardColor[] = [
    ...Array<CardColor>(9).fill(startingTeam),
    ...Array<CardColor>(8).fill(other(startingTeam)),
    ...Array<CardColor>(7).fill("neutral"),
    "assassin",
  ];
  const shuffledColors = shuffle(colors, rng);
  const cards: Card[] = picked.map((word, i) => ({ word: word.toUpperCase(), color: shuffledColors[i], revealed: false, marks: [] }));
  return { cards, startingTeam, turn: startingTeam, phase: "clue", clue: null, guessesMade: 0, winner: null, winReason: null };
}

export function remaining(game: Game, team: Team): number {
  return game.cards.filter((c) => c.color === team && !c.revealed).length;
}

function cleanName(name: string): string {
  const n = (name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  if (!n) throw new GameError("Digite um apelido para entrar.");
  return n;
}

function log(room: Room, now: number, entry: Omit<Room["log"][number], "at">) {
  room.log.push({ at: now, ...entry });
  if (room.log.length > MAX_LOG) room.log = room.log.slice(-MAX_LOG);
}

function clearMarks(game: Game) {
  for (const c of game.cards) c.marks = [];
}

function endTurn(room: Room, now: number, reason?: string) {
  const g = room.game!;
  const names = room.settings.teamNames;
  if (reason) log(room, now, { kind: "end_turn", team: g.turn, text: reason });
  g.turn = other(g.turn);
  g.phase = "clue";
  g.clue = null;
  g.guessesMade = 0;
  clearMarks(g);
  log(room, now, { kind: "system", team: g.turn, text: `Vez de ${names[g.turn]}.` });
}

function finish(room: Room, now: number, winner: Team, reason: "agents" | "assassin") {
  const g = room.game!;
  g.phase = "over";
  g.winner = winner;
  g.winReason = reason;
  g.clue = null;
  clearMarks(g);
  const names = room.settings.teamNames;
  log(room, now, {
    kind: "win",
    team: winner,
    text:
      reason === "assassin"
        ? `${names[other(winner)]} achou o ${ASSASSIN_LABEL}. ${names[winner]} venceu!`
        : `${names[winner]} encontrou todos os agentes e venceu!`,
  });
}

function requirePlayer(room: Room, playerId: string): Player {
  const p = room.players.find((x) => x.id === playerId);
  if (!p) throw new GameError("Você não está nesta sala. Recarregue a página para entrar de novo.");
  return p;
}

/** Coloca o jogador no time e trava a escolha para sempre nesta sala. */
function assign(room: Room, p: Player, team: Team, role: Role) {
  p.team = team;
  p.role = role;
  room.assignments = { ...room.assignments, [p.id]: { team, role } };
}

function requireHost(room: Room, playerId: string) {
  if (room.hostId !== playerId) throw new GameError("Só o admin da sala pode fazer isso.");
}

function requireGame(room: Room): Game {
  if (!room.game) throw new GameError("A partida ainda não começou.");
  return room.game;
}

/** Aplica uma ação e muta a sala. Lança GameError com mensagem pronta para mostrar ao jogador. */
export function applyAction(room: Room, playerId: string, action: Action, ctx: ActionContext): Room {
  const { now, rng } = ctx;
  const names = room.settings.teamNames;

  switch (action.type) {
    case "join": {
      const name = cleanName(action.name);
      const existing = room.players.find((p) => p.id === playerId);
      if (existing) {
        existing.name = name;
      } else {
        if (room.players.some((p) => normalize(p.name) === normalize(name))) {
          throw new GameError(`Já tem alguém chamado ${name} na sala. Escolha outro apelido.`);
        }
        if (room.players.length >= 40) throw new GameError("A sala está cheia.");
        const locked = room.assignments?.[playerId]; // quem saiu e voltou continua no mesmo time
        room.players.push({ id: playerId, name, team: locked?.team ?? null, role: locked?.role ?? null, joinedAt: now });
        log(room, now, { kind: "system", text: `${name} entrou na sala.` });
      }
      break;
    }

    case "leave": {
      const p = requirePlayer(room, playerId);
      room.players = room.players.filter((x) => x.id !== playerId);
      if (room.game) for (const c of room.game.cards) c.marks = c.marks.filter((id) => id !== playerId);
      if (room.hostId === playerId && room.players.length) room.hostId = room.players[0].id;
      log(room, now, { kind: "system", text: `${p.name} saiu da sala.` });
      break;
    }

    case "setRole": {
      const p = requirePlayer(room, playerId);
      if (p.team) {
        const role = p.role === "spymaster" ? "espião-mestre" : "agente";
        throw new GameError(`Você já está em ${names[p.team]} como ${role}. Depois de escolher, não dá para trocar.`);
      }
      if ((action.team !== "blue" && action.team !== "red") || (action.role !== "spymaster" && action.role !== "agent")) {
        throw new GameError("Escolha time e função.");
      }
      assign(room, p, action.team, action.role);
      break;
    }

    case "randomizeTeams": {
      // Só distribui quem ainda está sem time: quem já escolheu fica travado.
      requireHost(room, playerId);
      const free = shuffle(room.players.filter((p) => !p.team), rng);
      if (free.length === 0) throw new GameError("Todo mundo já está num time.");
      for (const p of free) {
        const size = (t: Team) => room.players.filter((x) => x.team === t).length;
        const team: Team = size("blue") === size("red") ? (rng() < 0.5 ? "blue" : "red") : size("blue") < size("red") ? "blue" : "red";
        const hasSpymaster = room.players.some((x) => x.team === team && x.role === "spymaster");
        assign(room, p, team, hasSpymaster ? "agent" : "spymaster");
      }
      log(room, now, { kind: "system", text: `${free.length === 1 ? "Uma pessoa sem time foi sorteada" : `${free.length} pessoas sem time foram sorteadas`}.` });
      break;
    }

    case "updateSettings": {
      requireHost(room, playerId);
      const s = action.settings;
      if (s.packs) {
        const valid = s.packs.filter((id) => WORD_PACKS.some((wp) => wp.id === id));
        room.settings.packs = valid;
      }
      if (s.customWords) {
        room.settings.customWords = s.customWords.map((w) => w.trim()).filter((w) => w && w.length <= 24).slice(0, 400);
      }
      if (s.teamNames) {
        room.settings.teamNames = {
          blue: (s.teamNames.blue ?? "").trim().slice(0, 18) || DEFAULT_TEAM_NAMES.blue,
          red: (s.teamNames.red ?? "").trim().slice(0, 18) || DEFAULT_TEAM_NAMES.red,
        };
      }
      break;
    }

    case "startGame": {
      requireHost(room, playerId);
      const pool = buildWordPool(room.settings.packs, room.settings.customWords);
      room.game = createGame(pool, rng);
      room.log = [];
      log(room, now, {
        kind: "system",
        team: room.game.startingTeam,
        text: `Nova partida! ${room.settings.teamNames[room.game.startingTeam]} começa e tem 9 agentes para achar.`,
      });
      break;
    }

    case "backToLobby": {
      requireHost(room, playerId);
      room.game = null;
      break;
    }

    case "claimHost": {
      requirePlayer(room, playerId);
      if (room.hostId !== playerId) {
        const hostPresent = room.players.some((p) => p.id === room.hostId);
        if (hostPresent && !ctx.hostIsStale) throw new GameError("O admin ainda está online.");
        room.hostId = playerId;
      }
      break;
    }

    case "giveClue": {
      const p = requirePlayer(room, playerId);
      const g = requireGame(room);
      if (g.phase !== "clue") throw new GameError("Agora não é hora de dar dica.");
      if (p.team !== g.turn || p.role !== "spymaster") throw new GameError("Só o espião-mestre do time da vez pode dar a dica.");
      const word = (action.word ?? "").trim();
      if (!word) throw new GameError("Escreva uma dica.");
      if (/\s/.test(word)) throw new GameError("A dica precisa ser uma palavra só (hífen vale).");
      if (word.length > 30) throw new GameError("Dica comprida demais.");
      const n = normalize(word);
      const clash = g.cards.find((c) => !c.revealed && (normalize(c.word) === n));
      if (clash) throw new GameError(`${clash.word} está no tabuleiro — não dá para usar como dica.`);
      const count = action.count;
      if (count !== null && (!Number.isInteger(count) || count < 0 || count > 9)) {
        throw new GameError("O número da dica vai de 0 a 9 (ou ∞).");
      }
      g.clue = { team: g.turn, word: word.toUpperCase(), count, by: p.name };
      g.phase = "guess";
      g.guessesMade = 0;
      log(room, now, {
        kind: "clue",
        team: g.turn,
        text: `${p.name} deu a dica ${word.toUpperCase()} ${count === null ? "∞" : count}.`,
      });
      break;
    }

    case "toggleMark": {
      const p = requirePlayer(room, playerId);
      const g = requireGame(room);
      if (g.phase !== "guess") throw new GameError("Espere o espião-mestre dar a dica.");
      if (p.team !== g.turn || p.role !== "agent") throw new GameError("Só os agentes do time da vez podem marcar cartas.");
      const card = g.cards[action.index];
      if (!card || card.revealed) throw new GameError("Essa carta não pode ser marcada.");
      card.marks = card.marks.includes(playerId) ? card.marks.filter((id) => id !== playerId) : [...card.marks, playerId];
      break;
    }

    case "reveal": {
      const p = requirePlayer(room, playerId);
      const g = requireGame(room);
      if (g.phase !== "guess") throw new GameError("Espere o espião-mestre dar a dica.");
      if (p.team !== g.turn || p.role !== "agent") throw new GameError("Só os agentes do time da vez podem revelar cartas.");
      const card = g.cards[action.index];
      if (!card || card.revealed) throw new GameError("Essa carta já foi revelada.");

      card.revealed = true;
      card.revealedBy = p.name;
      card.marks = [];
      const team = g.turn;
      const label =
        card.color === "neutral" ? NEUTRAL_LABEL : card.color === "assassin" ? ASSASSIN_LABEL : `agente de ${names[card.color]}`;
      log(room, now, { kind: "reveal", team, color: card.color, text: `${p.name} revelou ${card.word}: ${label}.` });

      if (card.color === "assassin") {
        finish(room, now, other(team), "assassin");
        break;
      }
      // Revelar a última carta de qualquer time dá a vitória para aquele time.
      const cleared = ([team, other(team)] as Team[]).find((t) => remaining(g, t) === 0);
      if (cleared) {
        finish(room, now, cleared, "agents");
      } else if (card.color === team) {
        g.guessesMade += 1;
        const limit = g.clue && g.clue.count !== null && g.clue.count > 0 ? g.clue.count + 1 : Infinity;
        if (g.guessesMade >= limit) endTurn(room, now, `${names[team]} usou todos os palpites.`);
      } else {
        endTurn(room, now);
      }
      break;
    }

    case "endTurn": {
      const p = requirePlayer(room, playerId);
      const g = requireGame(room);
      if (g.phase !== "guess") throw new GameError("Só dá para encerrar a vez durante os palpites.");
      if (p.team !== g.turn || p.role !== "agent") throw new GameError("Só os agentes do time da vez podem encerrar a vez.");
      if (g.guessesMade < 1) throw new GameError("O time precisa fazer pelo menos um palpite antes de passar a vez.");
      endTurn(room, now, `${p.name} encerrou a vez de ${names[g.turn]}.`);
      break;
    }

    default:
      throw new GameError("Ação desconhecida.");
  }

  room.version += 1;
  room.updatedAt = now;
  return room;
}

/** Monta o que um jogador pode ver: o gabarito só vai para espiões-mestres (ou quando a partida acaba). */
export function viewFor(room: Room, playerId: string | null): RoomView {
  const you = room.players.find((p) => p.id === playerId) ?? null;
  const seesKey = you?.role === "spymaster" || room.game?.phase === "over";
  const { assignments: _assignments, ...visible } = room;
  return {
    ...visible,
    you,
    game: room.game
      ? {
          ...room.game,
          cards: room.game.cards.map((c) => ({ ...c, color: c.revealed || seesKey ? c.color : null })),
        }
      : null,
  };
}
