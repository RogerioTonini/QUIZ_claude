# Claude Code Quiz

Quiz público de **Verdadeiro ou Falso** sobre o Claude Code, em português, inglês e alemão.

- 3 níveis (Iniciante, Intermediário, Avançado) e o modo Misto.
- 10 perguntas por partida, com 30 segundos cada.
- Pontuação calculada no servidor, com bônus de tempo e de sequência.
- Ranking público semanal e de todos os tempos.

Projeto independente, sem vínculo com a Anthropic. A especificação completa está em [`.llm/prd.md`](.llm/prd.md), e as decisões que a refinam estão em [`docs/decisions.md`](docs/decisions.md).

## Stack

- **Aplicação:** Next.js 16 (App Router, `cacheComponents`), TypeScript strict, Tailwind CSS v4 e next-intl 4.
- **Dados:** Prisma 7 sobre Postgres (Neon) e Zod para validação.
- **Testes:** Vitest (unitários e integração), Playwright e axe (E2E e acessibilidade).
- **Hospedagem:** Vercel, com Vercel Analytics.

## Rodando localmente

Pré-requisitos: Node 24 e pnpm 10.

```bash
pnpm install          # também roda `prisma generate`
cp .env.example .env.local
pnpm db:deploy        # aplica as migrações
pnpm dev              # http://localhost:3000
```

Variáveis de ambiente (`.env.local`):

| Variável               | Para quê                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Conexão com pooling, usada pela aplicação.                                                                                               |
| `DIRECT_URL`           | Conexão direta, usada pelas migrações. Na Vercel, se não for definida, vale `DATABASE_URL_UNPOOLED` da integração Neon.                  |
| `IP_HASH_SALT`         | Sal do hash de IP do rate limit. Use um valor aleatório longo; o IP puro nunca é gravado.                                                |
| `NEXT_PUBLIC_SITE_URL` | URL pública, para canonical, Open Graph e o link de compartilhar. Na Vercel, se não for definida, vale o domínio de produção do projeto. |
| `TEST_DATABASE_URL`    | Banco usado pelos testes de integração.                                                                                                  |

Sem um Postgres à mão, dá para usar um Postgres em memória (PGlite); veja a seção _Commands_ do [`CLAUDE.md`](CLAUDE.md).

## Scripts

| Comando                                                 | O que faz                                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`                | Desenvolvimento, build e servidor de produção.                                                  |
| `pnpm lint` / `pnpm format`                             | ESLint e Prettier (checar / corrigir).                                                          |
| `pnpm typecheck`                                        | Tipos de rota do Next e `tsc --noEmit`.                                                         |
| `pnpm test`                                             | Testes unitários (Vitest).                                                                      |
| `pnpm test:integration`                                 | Route handlers contra um Postgres real (`TEST_DATABASE_URL`).                                   |
| `pnpm test:e2e`                                         | Playwright: faz o build e sobe a aplicação na porta 3100. Precisa de banco e de `IP_HASH_SALT`. |
| `pnpm db:migrate` / `pnpm db:deploy` / `pnpm db:studio` | Criar migração, aplicar migrações, abrir o Prisma Studio.                                       |
| `node scripts/check-doc-urls.mts`                       | Confere se todo `docUrl` do banco de perguntas responde 2xx.                                    |
| `node scripts/smoke.mts <url>`                          | Smoke test de um deploy: páginas, headers e uma partida inteira pela API.                       |

O CI (GitHub Actions) roda lint, typecheck, testes unitários, migrações, integração e E2E em cada PR, com um Postgres 17 em container.

## Deploy (Vercel + Neon)

1. Importe o repositório na Vercel. O framework (Next.js) e o pnpm são detectados sozinhos.
2. Adicione a integração **Neon** ao projeto. Ela cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED`. Se possível, ative um branch do banco por preview, para que os PRs não migrem o banco de produção.
3. Defina `IP_HASH_SALT` (valor aleatório) em Production e Preview. `NEXT_PUBLIC_SITE_URL` é opcional: defina-a se usar um domínio próprio.
4. Ative o **Web Analytics** no painel do projeto.
5. Faça o deploy. O build roda `pnpm db:deploy && pnpm build` (`vercel.json`), então as migrações são aplicadas antes de cada build.
6. Rode `node scripts/smoke.mts https://<seu-domínio>`. Depois, no navegador, jogue uma partida, registre um apelido no ranking e troque de idioma no meio de uma partida.

## Adicionando ou editando perguntas

As perguntas ficam em [`src/content/questions.json`](src/content/questions.json) e só são lidas no servidor, então a resposta nunca chega ao navegador antes de o jogador responder.

- Cada pergunta tem `id` único, `level`, `category`, `answer`, `docUrl` (HTTPS, da documentação oficial) e `statement`/`explanation` nos três idiomas.
- Cada nível tem exatamente 10 perguntas.
- A `explanation` começa com o prefixo da resposta: `Verdadeiro.`/`Falso.`, `True.`/`False.`, `Wahr.`/`Falsch.`.
- Nomes do produto (Claude Code, hooks, MCP, CLAUDE.md, slash commands, Plan mode, subagents) não são traduzidos.
- Evite fatos voláteis (preços, nomes de modelos, limites numéricos) e duplas negações.

`pnpm test` valida o arquivo com o schema Zod e com essas regras. Antes de publicar, rode `node scripts/check-doc-urls.mts` e confira cada afirmação em https://code.claude.com/docs. Commits de conteúdo usam o tipo `data:`.

## Contribuindo

- Os commits seguem Conventional Commits; o hook fica em `.githooks-scripts/`. Ative-o com `git config core.hooksPath .githooks-scripts`.
- Documentação e textos da interface são em pt-BR; código e commits, em inglês.
