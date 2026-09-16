# Lead Secreto

Jogo de dicas e palavras para o time da Leadster jogar junto numa call. Dois times (Pagode × Sertanejo, nomes editáveis no lobby), um espião-mestre por time dá a dica, os agentes marcam palpites e revelam as cartas. Uso interno, feito para ~20 pessoas por sala.

## Rodar local

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # regras do jogo
```

Sem variáveis de ambiente o jogo guarda as salas em memória — funciona para testar local (abra duas janelas anônimas para simular jogadores), mas **não** funciona na Vercel.

## Publicar na Vercel

1. Suba a pasta num repositório no GitHub.
2. Na Vercel: **Add New → Project**, importe o repositório (framework: Next.js, sem configuração extra).
3. No projeto, abra **Storage → Create Database → Upstash (Redis)**, crie um banco no plano grátis e conecte ao projeto. As variáveis `KV_REST_API_URL`/`KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`) entram sozinhas.
4. Faça **Redeploy**. Pronto: crie uma sala, copie o link e mande no chat da call.

## Publicar num subcaminho (ex.: gustavoluby.com/codenames)

1. No projeto do jogo na Vercel, crie a variável `NEXT_PUBLIC_BASE_PATH=/codenames` e faça redeploy. O jogo passa a responder em `https://<projeto>.vercel.app/codenames`.
2. No site principal (gustavoluby.com), adicione um rewrite apontando o subcaminho para o projeto do jogo. Se o site for Next.js/Vercel, no `vercel.json` dele:

```json
{
  "rewrites": [
    { "source": "/codenames", "destination": "https://<projeto>.vercel.app/codenames" },
    { "source": "/codenames/:path*", "destination": "https://<projeto>.vercel.app/codenames/:path*" }
  ]
}
```

Alternativa mais simples: subdomínio (`codenames.gustavoluby.com`) em **Settings → Domains** do projeto do jogo, sem `NEXT_PUBLIC_BASE_PATH`.

## Como funciona

- **Tempo real por polling curto:** cada navegador pergunta ao servidor a cada ~1,2s se a versão da sala mudou. Se não mudou, é uma leitura de um número no Redis. Para o tamanho do time isso é mais simples e mais barato do que WebSocket, e roda em funções serverless comuns.
- **O servidor é a fonte da verdade:** todas as regras ficam em `lib/game.ts`. O gabarito das cores só é enviado para quem é espião-mestre (ou quando a partida acaba).
- **Salas expiram** 24h depois da última jogada.

## Personalizar

- Nome do jogo, nomes dos times, "Lead frio"/"Churn": `lib/config.ts`
- Palavras: `lib/words/*.ts` (novo pacote = novo arquivo + registrar em `lib/words/index.ts`)
- Cores e fontes: tokens no topo de `app/globals.css`
- O admin também pode colar palavras extras direto no lobby da sala.
