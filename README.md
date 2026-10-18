# Claude Code Quiz

Quiz público de **Verdadeiro ou Falso** sobre o Claude Code, em português, inglês e alemão.

- 3 níveis (Iniciante, Intermediário, Avançado) e o modo Misto.
- 10 perguntas por partida, com 30 segundos cada.
- Pontuação calculada no servidor, com bônus de tempo e de sequência.
- Ranking público semanal e de todos os tempos.

Projeto independente, sem vínculo com a Anthropic. A especificação completa está em [`.llm/prd.md`](.llm/prd.md), e as decisões que a refinam estão em [`docs/decisions.md`](docs/decisions.md).

## Stack

- **Aplicação:** Next.js 16 (App Router, `cacheComponents`), TypeScript strict, Tailwind CSS v4 e next-intl 4.
- **Dados:** Prisma 7 sobre Postgres (Supabase) e Zod para validação. O Supabase é usado só como banco: o app não usa Auth, Storage nem a Data API dele.
- **Testes:** Vitest (unitários e integração), Playwright e axe (E2E e acessibilidade).
- **Hospedagem:** Vercel, com Vercel Analytics.

## Rodando localmente

Pré-requisitos: Node 24 e pnpm 10.

```bash
pnpm install          # também roda `prisma generate`
# crie o .env.local com as variáveis da tabela abaixo
pnpm db:deploy        # aplica as migrações
pnpm dev              # http://localhost:3000
```

Variáveis de ambiente (`.env.local`):

| Variável               | Para quê                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Conexão usada pela aplicação. No Supabase: o _transaction pooler_ (porta 6543).                                                          |
| `DIRECT_URL`           | Conexão usada pelas migrações. No Supabase: o _session pooler_ (porta 5432).                                                             |
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

## Deploy (Vercel + Supabase)

### Banco no Supabase

1. Crie dois projetos no Supabase: um de produção e um de desenvolvimento (`dev`), que também serve aos previews da Vercel. Anote a senha do banco de cada um.
2. Em cada projeto, abra **Connect** e copie as duas strings de conexão:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL`. Acrescente `?sslmode=require&uselibpqcompat=true`.
   - **Session pooler** (porta 5432) → `DIRECT_URL`. Acrescente `?sslmode=require`.

   Não use a _direct connection_ (`db.<ref>.supabase.co`): ela só tem IPv6, e o build da Vercel não a alcança.

3. Opcional: desative a **Data API** do projeto (o app não a usa). Mesmo ativa, ela não acessa as tabelas, porque a migração `enable_rls` liga o RLS sem nenhuma policy.

Os parâmetros de SSL existem porque o driver `pg` trata `sslmode=require` como verificação completa do certificado, e o certificado do Supabase é emitido por uma CA própria. Com `uselibpqcompat=true`, a conexão continua cifrada, mas o certificado não é verificado (o comportamento do `libpq`). As migrações usam o motor do Prisma, que já segue o `libpq`.

### Projeto na Vercel

1. Importe o repositório na Vercel. O framework (Next.js) e o pnpm são detectados sozinhos.
2. Em **Settings → Environment Variables**, defina:
   - `DATABASE_URL` e `DIRECT_URL`: as do projeto de produção em _Production_, e as do projeto `dev` em _Preview_ (assim os PRs não migram o banco de produção);
   - `IP_HASH_SALT`: um valor aleatório, em _Production_ e _Preview_;
   - `NEXT_PUBLIC_SITE_URL`: opcional, só se usar um domínio próprio.
3. Ative o **Web Analytics** no painel do projeto.
4. Faça o deploy. O build roda `pnpm db:deploy && pnpm build` (`vercel.json`), então as migrações são aplicadas antes de cada build.
5. Rode `node scripts/smoke.mts https://<seu-domínio>`. Depois, no navegador, jogue uma partida, registre um apelido no ranking e troque de idioma no meio de uma partida.

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
