# CLAUDE.md — Lead Secreto

Jogo interno da Leadster: dois times, espião-mestre dá dica de uma palavra + número, agentes adivinham num tabuleiro 5×5. Mecânica clássica de jogo de dicas e palavras. **Não usar o nome, a arte ou os personagens de jogos comerciais do gênero** (ex.: Codenames é marca registrada da CGE) — o jogo tem nome e visual próprios.

## Stack
- Next.js (App Router) + React + TypeScript, CSS puro (`app/globals.css`, sem Tailwind)
- Upstash Redis via `@upstash/redis` em produção; fallback em memória quando não há env vars (só dev)
- Vitest para as regras
- Deploy: Vercel

## Mapa do código
```
lib/config.ts        nome do jogo, nomes dos times, rótulos, TTL, intervalos de polling
lib/types.ts         Room, Game, Card, Player, Action, RoomView
lib/game.ts          regras puras: createRoom, createGame, applyAction, viewFor  ← mexa aqui para mudar regra
lib/game.test.ts     testes das regras (rode sempre que mexer em game.ts)
lib/store.ts         Redis/memória: getRoom, saveRoom, getVersion, withRoomLock, presença
lib/words/           pacotes de palavras (leadster, time, geral) + registro em index.ts
lib/client.ts        identidade no localStorage + hook useRoom (polling e act)
app/api/rooms/                    POST cria sala
app/api/rooms/[code]/             GET estado (?player&since&touch)
app/api/rooms/[code]/action/      POST ação { playerId, action }
app/page.tsx                      home (criar / entrar)
app/sala/[code]/page.tsx          sala
components/                       RoomScreen, Board, TeamPanel, ActionBar, Lobby, StatusLine, GameLog, RulesDialog
```

## Decisões importantes
- **Servidor autoritativo.** O cliente só envia intenções (`Action`). Toda validação acontece em `applyAction`, que lança `GameError` com mensagem em PT-BR pronta para o toast.
- **Gabarito protegido.** `viewFor` zera `color` das cartas não reveladas para quem não é espião-mestre. Nunca mande o `Room` cru para o cliente.
- **Polling com versão.** Cada ação incrementa `room.version` e grava a versão numa chave separada. O GET compara com `since` e só devolve a sala se mudou. Presença é gravada a cada ~10s num hash separado (não altera a versão).
- **Concorrência.** `withRoomLock` usa `SET NX PX` por sala; ler → aplicar → salvar acontece dentro da trava.
- **IDs de time internos são `blue` e `red`.** Os nomes exibidos vêm de `room.settings.teamNames` (padrão Marketing/Vendas) e as cores de `--team-blue` (azul) e `--team-red` (verde WhatsApp). Não renomeie os IDs; mude só nome/cor.
- Identidade do jogador: UUID no localStorage (`lead-secreto:identity`). Sem login.

## Regras implementadas
- 25 cartas: 9 do time que começa (sorteado), 8 do outro, 7 neutras ("Lead frio"), 1 assassina ("Churn").
- Dica: uma palavra (hífen permitido), não pode ser igual (sem acento/caixa) a carta não revelada. Número 0–9 ou ∞.
- Palpites: até número+1; 0 ou ∞ = ilimitado. Mínimo de 1 palpite antes de encerrar a vez.
- Marcar carta (toggle, mostra nomes) ≠ revelar. Marcações são limpas a cada troca de vez.
- Própria cor: continua. Neutra/adversária: passa a vez. Assassina: perde na hora. Revelar a última carta de qualquer time dá vitória a esse time.
- Admin: cria a sala, configura pacotes/nomes/palavras extras, sorteia times, começa/encerra. Se ficar offline >45s, outro jogador pode assumir.

## Convenções
- Todo texto de interface em português do Brasil, sentence case, verbos diretos ("Revelar", "Enviar dica", "Encerrar a vez").
- Mantenha `lib/game.ts` sem dependência de Next/Redis para continuar testável.
- Antes de commitar: `npm test && npm run typecheck && npm run build`.

## Tarefa pendente: palavras das reuniões do time
O usuário vai colocar transcrições de reuniões de descontração (brindes, happy hours, momentos do time) numa pasta, por exemplo `transcricoes/` (não versionar — adicione ao `.gitignore`). Ao receber:
1. Leia as transcrições e extraia **piadas internas, apelidos, bordões, lugares, comidas, eventos e objetos** que o time todo reconheceria.
2. Critérios: substantivos ou expressões de até 2–3 palavras, máx. 24 caracteres; nada ofensivo, constrangedor ou que exponha algo pessoal/sensível de alguém (saúde, relacionamento, dinheiro, demissões, conflitos); evite termos que só 1–2 pessoas entenderiam.
3. Coloque o resultado em `lib/words/time.ts` (mantendo os nomes que já estão lá), idealmente 60–150 palavras, agrupadas com comentários por tema.
4. Termos de trabalho (produto, mídia, vendas) que aparecerem e não estiverem em `lib/words/leadster.ts` podem ir para lá.
5. Mostre a lista para o usuário revisar antes de commitar.

## Ideias futuras (só se o usuário pedir)
- Timer por vez (configurável no lobby)
- Sons de revelar/vitória
- Modo com 3+ times ou modo cooperativo de 2 jogadores
- Placar acumulado da sala entre partidas
