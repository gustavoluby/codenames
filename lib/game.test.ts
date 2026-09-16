import { describe, expect, it } from "vitest";
import { applyAction, createGame, createRoom, remaining, viewFor } from "./game";
import type { Card, Room, Team } from "./types";

function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const ctx = (rng = seeded()) => ({ now: 1, rng, hostIsStale: false });

function setup(): Room {
  const room = createRoom("TESTE", { id: "host-0001", name: "Luby" }, 0);
  const c = ctx();
  applyAction(room, "bluesm-01", { type: "join", name: "Fê" }, c);
  applyAction(room, "blueag-01", { type: "join", name: "Caio" }, c);
  applyAction(room, "redsm-001", { type: "join", name: "Lucas" }, c);
  applyAction(room, "host-0001", { type: "setRole", team: "red", role: "agent" }, c);
  applyAction(room, "bluesm-01", { type: "setRole", team: "blue", role: "spymaster" }, c);
  applyAction(room, "blueag-01", { type: "setRole", team: "blue", role: "agent" }, c);
  applyAction(room, "redsm-001", { type: "setRole", team: "red", role: "spymaster" }, c);
  applyAction(room, "host-0001", { type: "startGame" }, c);
  return room;
}
const sm = (t: Team) => (t === "blue" ? "bluesm-01" : "redsm-001");
const ag = (t: Team) => (t === "blue" ? "blueag-01" : "host-0001");
const idx = (room: Room, pred: (c: Card) => boolean) =>
  room.game!.cards.findIndex((c) => !c.revealed && pred(c));

describe("tabuleiro", () => {
  it("tem 9/8/7/1", () => {
    const words = Array.from({ length: 40 }, (_, i) => `palavra${i}`);
    const g = createGame(words, seeded(7));
    const count = (col: string) => g.cards.filter((c) => c.color === col).length;
    expect(g.cards).toHaveLength(25);
    expect(count(g.startingTeam)).toBe(9);
    expect(count(g.startingTeam === "blue" ? "red" : "blue")).toBe(8);
    expect(count("neutral")).toBe(7);
    expect(count("assassin")).toBe(1);
  });

  it("exige 25 palavras únicas", () => {
    expect(() => createGame(["a", "A", "b"], seeded())).toThrow(/25 palavras/);
  });
});

describe("regras", () => {
  it("esconde o gabarito dos agentes e mostra para o espião-mestre", () => {
    const room = setup();
    expect(viewFor(room, "blueag-01").game!.cards.every((c) => c.color === null)).toBe(true);
    expect(viewFor(room, "bluesm-01").game!.cards.every((c) => c.color !== null)).toBe(true);
  });

  it("não aceita dica igual a palavra do tabuleiro", () => {
    const room = setup();
    const t = room.game!.turn;
    const word = room.game!.cards[0].word.toLowerCase();
    expect(() => applyAction(room, sm(t), { type: "giveClue", word, count: 1 }, ctx())).toThrow(/tabuleiro/);
  });

  it("limita palpites a número + 1", () => {
    const room = setup();
    const t = room.game!.turn;
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 1 }, ctx());
    applyAction(room, ag(t), { type: "reveal", index: idx(room, (c) => c.color === t) }, ctx());
    expect(room.game!.turn).toBe(t);
    applyAction(room, ag(t), { type: "reveal", index: idx(room, (c) => c.color === t) }, ctx());
    expect(room.game!.turn).not.toBe(t);
    expect(room.game!.phase).toBe("clue");
  });

  it("carta neutra encerra a vez e limpa marcações", () => {
    const room = setup();
    const t = room.game!.turn;
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 2 }, ctx());
    applyAction(room, ag(t), { type: "toggleMark", index: 0 }, ctx());
    expect(room.game!.cards[0].marks).toContain(ag(t));
    applyAction(room, ag(t), { type: "reveal", index: idx(room, (c) => c.color === "neutral") }, ctx());
    expect(room.game!.turn).not.toBe(t);
    expect(room.game!.cards.every((c) => c.marks.length === 0)).toBe(true);
  });

  it("não deixa passar a vez sem palpite", () => {
    const room = setup();
    const t = room.game!.turn;
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 0 }, ctx());
    expect(() => applyAction(room, ag(t), { type: "endTurn" }, ctx())).toThrow(/pelo menos um/);
  });

  it("assassino dá vitória ao outro time", () => {
    const room = setup();
    const t = room.game!.turn;
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 1 }, ctx());
    applyAction(room, ag(t), { type: "reveal", index: idx(room, (c) => c.color === "assassin") }, ctx());
    expect(room.game!.phase).toBe("over");
    expect(room.game!.winner).not.toBe(t);
    expect(viewFor(room, "blueag-01").game!.cards.every((c) => c.color !== null)).toBe(true);
  });

  it("revelar a última carta do adversário dá a vitória a ele", () => {
    const room = setup();
    const t = room.game!.turn;
    const opp: Team = t === "blue" ? "red" : "blue";
    // revela direto todas menos uma do adversário
    room.game!.cards.filter((c) => c.color === opp).slice(1).forEach((c) => (c.revealed = true));
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 1 }, ctx());
    applyAction(room, ag(t), { type: "reveal", index: idx(room, (c) => c.color === opp) }, ctx());
    expect(remaining(room.game!, opp)).toBe(0);
    expect(room.game!.winner).toBe(opp);
  });

  it("só o espião-mestre da vez dá dica e só agente da vez revela", () => {
    const room = setup();
    const t = room.game!.turn;
    const opp: Team = t === "blue" ? "red" : "blue";
    expect(() => applyAction(room, sm(opp), { type: "giveClue", word: "xyz", count: 1 }, ctx())).toThrow();
    applyAction(room, sm(t), { type: "giveClue", word: "xyz", count: 1 }, ctx());
    expect(() => applyAction(room, ag(opp), { type: "reveal", index: 0 }, ctx())).toThrow();
    expect(() => applyAction(room, sm(t), { type: "reveal", index: 0 }, ctx())).toThrow();
  });
});

describe("times travados", () => {
  it("quem entrou num time não troca de time, de função nem vira espectador", () => {
    const room = setup();
    expect(() => applyAction(room, "bluesm-01", { type: "setRole", team: "blue", role: "agent" }, ctx())).toThrow(/não dá para trocar/);
    expect(() => applyAction(room, "bluesm-01", { type: "setRole", team: "red", role: "spymaster" }, ctx())).toThrow(/não dá para trocar/);
    expect(() =>
      applyAction(room, "bluesm-01", { type: "setRole", team: null, role: null } as never, ctx()),
    ).toThrow(/não dá para trocar/);
    expect(room.players.find((p) => p.id === "bluesm-01")).toMatchObject({ team: "blue", role: "spymaster" });
  });

  it("sair e voltar para a sala mantém o time e a função", () => {
    const room = setup();
    applyAction(room, "bluesm-01", { type: "leave" }, ctx());
    applyAction(room, "bluesm-01", { type: "join", name: "Fê" }, ctx());
    expect(room.players.find((p) => p.id === "bluesm-01")).toMatchObject({ team: "blue", role: "spymaster" });
    expect(() => applyAction(room, "bluesm-01", { type: "setRole", team: "red", role: "agent" }, ctx())).toThrow();
  });

  it("sortear só distribui quem está sem time", () => {
    const room = setup();
    applyAction(room, "livre-001", { type: "join", name: "Davi" }, ctx());
    applyAction(room, "livre-002", { type: "join", name: "Let" }, ctx());
    const before = room.players.filter((p) => p.team).map((p) => ({ ...p }));
    applyAction(room, "host-0001", { type: "randomizeTeams" }, ctx());
    for (const p of before) expect(room.players.find((x) => x.id === p.id)).toMatchObject({ team: p.team, role: p.role });
    const blue = room.players.filter((p) => p.team === "blue");
    const red = room.players.filter((p) => p.team === "red");
    expect(room.players.every((p) => p.team)).toBe(true);
    expect(Math.abs(blue.length - red.length)).toBeLessThanOrEqual(1);
    expect(() => applyAction(room, "host-0001", { type: "randomizeTeams" }, ctx())).toThrow(/Todo mundo/);
  });

  it("não manda a lista de travas para o navegador", () => {
    const room = setup();
    expect(room.assignments).toBeDefined();
    expect("assignments" in viewFor(room, "blueag-01")).toBe(false);
  });
});
