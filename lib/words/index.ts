import { geral } from "./geral";
import { leadster } from "./leadster";
import { time } from "./time";

export interface WordPack {
  id: string;
  name: string;
  description: string;
  words: string[];
}

export const WORD_PACKS: WordPack[] = [
  { id: "leadster", name: "Leadster", description: "Marketing, vendas, produto e rotina", words: leadster },
  { id: "time", name: "Time Leadster", description: "Pessoas e piadas internas", words: time },
  { id: "geral", name: "Geral", description: "Palavras comuns do português", words: geral },
];

export const DEFAULT_PACKS = ["leadster", "time"];

export function buildWordPool(packIds: string[], customWords: string[] = []): string[] {
  const fromPacks = WORD_PACKS.filter((p) => packIds.includes(p.id)).flatMap((p) => p.words);
  return [...fromPacks, ...customWords];
}
