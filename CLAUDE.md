# CLAUDE.md — Lead Secreto

Jogo interno da Leadster: dois times, espião-mestre dá dica de uma palavra + número, agentes adivinham num tabuleiro 5×5. Mecânica clássica de jogo de dicas e palavras. **Não usar o nome, a arte ou os personagens de jogos comerciais do gênero** (ex.: Codenames é marca registrada da CGE) — o jogo tem nome e visual próprios.

## Stack
- Next.js (App Router) + React + TypeScript, CSS puro (`app/globals.css`, sem Tailwind), ícones `lucide-react`
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
- **IDs de time internos são `blue` e `red`.** Os nomes exibidos vêm de `room.settings.teamNames` (padrão Pagode/Sertanejo, rivalidade que saiu dos happy hours; o time não quer Marketing × Vendas) e as cores de `--blue` (azul) e `--green` (verde). Não renomeie os IDs; mude só nome/cor.
- Identidade do jogador: UUID no localStorage (`lead-secreto:identity`). Sem login.

## Design ("dossiê noturno")
- Tema escuro fixo: mesa azul-carvão com luz de luminária e grão, cartas de papel marfim com faixa marrom (sem a palavra de ponta-cabeça: o usuário achou poluído). Referências dos prints ficam em `temp/` (não versionado).
- Tokens em OKLCH no topo de `app/globals.css`. Dourado (`--gold`) é só para ação principal; azul = time `blue`, verde WhatsApp = time `red`.
- Fontes: Barlow Condensed (títulos, cartas, botões principais), Figtree (texto e UI), Special Elite (carimbos, código da sala).
- Ilustrações são silhuetas SVG originais em `components/Figure.tsx` (agente de chapéu, espiã de chanel, civil, Churn encapuzado). Pintam com `currentColor` + `--fig-face`/`--fig-detail`.
- `components/CardFace.tsx` é o miolo da carta, usado no tabuleiro e na cena da home. Ícones: `lucide-react`.

## Efeitos e som
- Nada muda na tela em silêncio: `lib/events.ts` (`useRoomEvents`) compara a sala nova com a anterior e transforma a diferença em anúncio, clarão e som. Quem abre a sala no meio da partida só "fotografa" o estado, não leva enxurrada de efeito.
- `components/Announcer.tsx` desenha a faixa central (vez, dica, partida nova, vitória) e o clarão colorido da carta revelada. É `pointer-events: none`: nunca rouba clique.
- `components/Board.tsx` marca por ~1s as cartas que acabaram de ser reveladas (estouro de luz) ou votadas (anel dourado), e distribui as 25 cartas com atraso escalonado (`--i`) quando o baralho é novo.
- Luz de mesa na cor do time da vez (`.room.turn-blue/.turn-red`), painel do time da vez "respirando", contador que pula ao mudar, `.actionbar.is-live` brilhando, tremida na tela quando sai o Churn.
- `lib/sound.ts` sintetiza tudo no Web Audio (sem arquivo de áudio): voto, dica, troca de vez, acerto, lead frio, carta do adversário, Churn, vitória e as cartas caindo na mesa. O navegador só libera som depois de um gesto — `unlockAudio()` roda no primeiro clique/tecla. Botão "Som on/off" na barra de cima, salvo em `lead-secreto:mute`.
- Tudo respeita `prefers-reduced-motion` pela regra global no fim do `globals.css`.

## Regras implementadas
- 25 cartas: 9 do time que começa (sorteado), 8 do outro, 7 neutras ("Lead frio"), 1 assassina ("Churn").
- Dica: uma palavra (hífen permitido), não pode ser igual (sem acento/caixa) a carta não revelada. Número 0–9 ou ∞.
- Palpites: até número+1; 0 ou ∞ = ilimitado. Mínimo de 1 palpite antes de encerrar a vez.
- Marcar carta = votar (toggle, mostra os nomes de quem votou) ≠ revelar. Revelar é o ✓ pequeno no canto superior direito, que só aparece no hover (no celular, só nas cartas que você votou), para ninguém revelar sem querer. Marcações são limpas a cada troca de vez.
- Própria cor: continua. Neutra/adversária: passa a vez. Assassina: perde na hora. Revelar a última carta de qualquer time dá vitória a esse time.
- **Time e função travados:** depois de escolher, o jogador não troca de time, de função nem vira espectador. A escolha fica em `room.assignments` (não vai para o navegador) e volta se a pessoa sair e entrar de novo. Não existe "Limpar times"; o sorteio só distribui quem está sem time.
- Admin: cria a sala, configura pacotes/nomes/palavras extras, sorteia quem está sem time, começa/encerra. Se ficar offline >45s, outro jogador pode assumir.

## Convenções
- Todo texto de interface em português do Brasil, sentence case, verbos diretos ("Revelar", "Enviar dica", "Encerrar a vez").
- Mantenha `lib/game.ts` sem dependência de Next/Redis para continuar testável.
- Antes de commitar: `npm test && npm run typecheck && npm run build`.

## Palavras das reuniões do time (feito em 16/09/2026; repetir o processo quando vierem novas transcrições)
O usuário vai colocar transcrições de reuniões de descontração (brindes, happy hours, momentos do time) numa pasta, por exemplo `transcricoes/` (não versionar — adicione ao `.gitignore`). Ao receber:
1. Leia as transcrições e extraia **piadas internas, apelidos, bordões, lugares, comidas, eventos e objetos** que o time todo reconheceria.
2. Critérios: substantivos ou expressões de até 2–3 palavras, máx. 24 caracteres; nada ofensivo, constrangedor ou que exponha algo pessoal/sensível de alguém (saúde, relacionamento, dinheiro, demissões, conflitos); evite termos que só 1–2 pessoas entenderiam.
3. Coloque o resultado em `lib/words/time.ts` (mantendo os nomes que já estão lá), idealmente 60–150 palavras, agrupadas com comentários por tema.
4. Termos de trabalho (produto, mídia, vendas) que aparecerem e não estiverem em `lib/words/leadster.ts` podem ir para lá.
5. Mostre a lista para o usuário revisar antes de commitar.

## Ideias futuras (só se o usuário pedir)
- Timer por vez (configurável no lobby)
- Modo com 3+ times ou modo cooperativo de 2 jogadores
- Placar acumulado da sala entre partidas

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
