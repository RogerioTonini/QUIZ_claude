# PRD — Claude Code Quiz (Verdadeiro ou Falso)

> **Documento-fonte para o Claude Code construir o projeto.**
> Versão: 1.0 · Data: 2026-10-16 · Status: Aprovado para implementação (MVP)
> Idioma do documento: pt-BR. Identificadores de código, nomes de arquivos e commits em inglês.

---

## 0. Instruções para o Claude Code (leia primeiro)

1. Este PRD é a fonte da verdade. Em caso de dúvida não coberta aqui, escolha a opção mais simples, registre a decisão em `docs/decisions.md` e siga.
2. Implemente **por fases** (seção 13). Ao fim de cada fase: `pnpm lint`, `pnpm typecheck`, `pnpm test` precisam passar.
3. Crie um `CLAUDE.md` na raiz do projeto resumindo stack, comandos e convenções (seção 12).
4. **Nunca** envie a resposta correta (`answer`) nem a explicação ao cliente antes de o jogador responder. As perguntas são lidas **somente no servidor**.
5. Toda informação técnica sobre o Claude Code no banco de perguntas deve ser **validada contra a documentação oficial** (https://code.claude.com/docs) antes do release; ajuste links `docUrl` que estiverem quebrados.
6. Não adicione funcionalidades listadas em "Fora de escopo" (seção 15).

---

## 1. Visão geral

### 1.1 Problema
O Claude Code cresce rápido em adoção, mas muita gente — de gestores a desenvolvedores — tem noções vagas ou erradas sobre o que ele faz, como funciona e quais recursos avançados existem (hooks, MCP, subagentes, SDK). Falta uma forma leve, divertida e rápida de testar e corrigir esse conhecimento.

### 1.2 Solução
Um **quiz web público de Verdadeiro ou Falso** sobre o Claude Code, com três níveis de dificuldade (do negócio ao avançado), timer por pergunta, pontuação, explicação didática após cada resposta (com link para a documentação oficial) e **ranking público** por apelido. Disponível em **pt-BR (padrão), Inglês e Alemão**.

### 1.3 Objetivos de negócio
| # | Objetivo | Métrica de sucesso (90 dias após lançamento) |
|---|----------|-----------------------------------------------|
| O1 | Educar sobre o Claude Code de forma engajante | ≥ 60% das partidas iniciadas são concluídas |
| O2 | Gerar engajamento recorrente | ≥ 25% dos visitantes jogam 2+ partidas |
| O3 | Levar o usuário à documentação oficial | CTR ≥ 10% nos links "Saiba mais" |
| O4 | Estimular competição saudável | ≥ 40% das partidas concluídas registram apelido no ranking |
| O5 | Alcance internacional | ≥ 20% das partidas em EN ou DE |

### 1.4 Público-alvo (público aberto)
| Persona | Perfil | O que busca | Nível típico |
|---------|--------|-------------|--------------|
| **Ana, gestora** | Líder de produto/negócio, não programa | Entender o que o Claude Code é, para que serve, riscos e valor | Iniciante |
| **Bruno, dev curioso** | Desenvolvedor que começou a usar o Claude Code | Validar comandos e fluxo do dia a dia | Intermediário |
| **Carla, power user** | Dev/Tech lead que automatiza com o Claude Code | Testar conhecimento de hooks, MCP, permissões, SDK | Avançado |
| **Estudante/entusiasta** | Aprendendo IA aplicada a software | Aprender jogando e competir no ranking | Qualquer |

---

## 2. Escopo do MVP (v1)

**Dentro do escopo**
- Escolha de nível: **Iniciante**, **Intermediário**, **Avançado** e **Misto** (sorteia dos três).
- Partida com **10 perguntas** sorteadas sem repetição do nível escolhido.
- Banco inicial de **30 perguntas** (10 por nível), em pt-BR, en e de.
- **Timer** de 30 segundos por pergunta.
- **Sistema de pontuação** com pontos por nível, bônus de tempo e bônus de sequência.
- **Explicação** após cada resposta + link "Saiba mais" para a doc oficial.
- **Tela de resultado** com placar, acertos, desempenho por categoria e revisão das respostas.
- **Ranking/Leaderboard** público por apelido (sem login), filtrável por nível e período.
- **i18n**: pt-BR (padrão), en, de, com seletor de idioma sempre visível.
- Responsivo (mobile-first), acessível (WCAG 2.1 AA), modo claro/escuro.

---

## 3. Requisitos funcionais

### RF01 — Home
- Título, subtítulo curto explicando o quiz, seletor de idioma, botão de tema.
- 4 cards de nível (Iniciante, Intermediário, Avançado, Misto) com descrição e pontos-base.
- Link para o Ranking e para "Como funciona" (regras de pontuação).
- Botão "Jogar" inicia a partida no nível selecionado.

### RF02 — Iniciar partida
- `POST /api/games` cria uma sessão de jogo no servidor com 10 perguntas sorteadas (sem repetição) e retorna `gameId`.
- Para o nível **Misto**: sortear distribuição 3 iniciante / 4 intermediário / 3 avançado.
- O idioma da partida é o idioma ativo no momento do início (pode trocar a UI depois, mas o conteúdo segue o `locale` da partida; ao trocar idioma durante a partida, a próxima pergunta é carregada no novo idioma — o servidor aceita `locale` em cada chamada).

### RF03 — Tela de pergunta
- Mostra: progresso (ex.: "3/10"), nível/categoria, enunciado, timer visual (barra + segundos), pontuação atual, sequência atual.
- Dois botões grandes: **Verdadeiro** e **Falso**. Atalhos de teclado: `V`/`T` = Verdadeiro, `F` = Falso (adaptar por idioma: en `T/F`, de `W/F` — "Wahr/Falsch"), `Enter` = próxima.
- Ao responder ou o tempo acabar: bloqueia os botões e mostra o feedback (RF04).
- Ao recarregar a página, a partida continua na pergunta atual (estado vem do servidor); o timer **não** reinicia (tempo conta a partir de `servedAt` do servidor).

### RF04 — Feedback e explicação
- Indicação clara de acerto/erro (cor **e** ícone **e** texto — não depender só de cor).
- Exibe a resposta correta, explicação de 1–3 frases e link "Saiba mais" (abre em nova aba) para a doc oficial.
- Mostra pontos ganhos na pergunta (base + bônus).
- Tempo esgotado conta como erro ("Tempo esgotado").
- Botão "Próxima" (ou "Ver resultado" na última).

### RF05 — Resultado
- Pontuação total, acertos (x/10), tempo total, maior sequência.
- Desempenho por categoria (ex.: "Fundamentos 3/3, Comandos 1/2").
- Revisão: lista das 10 perguntas com resposta dada, correta e explicação.
- Mensagem de desempenho por faixa (0–4: "Continue explorando", 5–7: "Bom trabalho", 8–9: "Excelente", 10: "Mestre do Claude Code").
- Formulário de apelido para entrar no ranking (RF06) e botões "Jogar de novo" e "Ver ranking".
- Botão "Compartilhar" usando Web Share API, com fallback para copiar texto ("Fiz X pontos no Claude Code Quiz (nível Y)! <url>").

### RF06 — Registrar no ranking
- Apelido: 3–20 caracteres, regex `^[\p{L}\p{N}_\-. ]+$`, trim, sem palavrões (filtro em pt/en/de).
- Uma entrada por partida (`gameId` único). Só partidas `FINISHED` podem ser registradas, em até 30 minutos após o fim.
- Após registrar, mostrar a posição do jogador no ranking do nível.

### RF07 — Ranking
- Abas por nível (Iniciante, Intermediário, Avançado, Misto) e filtro de período (**Semana** — padrão, **Todos os tempos**).
- Top 50: posição, apelido, pontuação, acertos, tempo total, data.
- Desempate: maior pontuação → mais acertos → menor tempo total → registro mais antigo.
- Destaca a linha do jogador atual (se registrou nesta sessão do navegador — guardar `gameId` em `localStorage`).

### RF08 — Internacionalização
- Locales: `pt-BR` (padrão), `en`, `de`. Rotas com prefixo: `/pt-BR`, `/en`, `/de`. `/` redireciona por `Accept-Language`, fallback `pt-BR`.
- Seletor de idioma no header (bandeira + sigla: PT · EN · DE), persistido em cookie `NEXT_LOCALE`.
- Toda a UI e todo o conteúdo das perguntas traduzidos. Termos técnicos do produto **não** são traduzidos (Claude Code, hooks, MCP, CLAUDE.md, slash commands, Plan mode, subagents).

### RF09 — Como funciona
- Página/modal explicando regras, timer e pontuação, com aviso: "Quiz não oficial, criado pela comunidade; não afiliado à Anthropic."

---

## 4. Regras de pontuação

| Nível | Pontos-base por acerto |
|-------|------------------------|
| Iniciante | 100 |
| Intermediário | 150 |
| Avançado | 200 |

- **Bônus de tempo**: `floor(base * 0.5 * tempoRestante / 30)` — até +50% se responder na hora.
- **Bônus de sequência**: a partir do 3º acerto seguido, +10% da base por acerto consecutivo (3º = +10%, 4º = +20%…, limite +50%).
- **Erro ou tempo esgotado**: 0 pontos e zera a sequência. Não há pontos negativos.
- No modo **Misto**, cada pergunta usa a base do seu próprio nível.
- **Todo cálculo é feito no servidor** com o tempo medido no servidor (`answeredAt - servedAt`), tolerância de +2s para latência; acima de 30s + tolerância = tempo esgotado.
- Pontuação máxima teórica (Avançado, 10/10, instantâneo): exibida em "Como funciona".

---

## 5. Conteúdo: banco de perguntas

### 5.1 Estrutura e categorias
- 30 perguntas: 10 por nível. Equilíbrio de respostas: ~60% V / ~40% F por nível.
- Categorias: `fundamentals`, `business`, `workflow`, `commands`, `config`, `extensibility`, `security`, `automation`.
- Cada pergunta: enunciado inequívoco, uma única afirmação, sem pegadinhas de redação; explicação curta que ensina algo.

### 5.2 Diretrizes editoriais
- Evitar afirmações que mudam com frequência (preços, nomes de modelos, limites numéricos).
- Evitar negações duplas.
- Explicação começa com "Verdadeiro." ou "Falso." seguida do motivo.
- Traduções para en/de devem preservar o sentido exato (o valor V/F não pode mudar com a tradução).

### 5.3 Banco inicial (pt-BR — fonte; gerar en e de a partir daqui)

> ⚠️ Validar cada item contra a documentação oficial antes do release (ver seção 0, item 5). Os `docUrl` abaixo são caminhos sugeridos e devem ser conferidos.

#### Iniciante (negócio/fundamentos) — 100 pts

| ID | Afirmação | Resp. | Explicação | Categoria |
|----|-----------|-------|------------|-----------|
| B01 | O Claude Code é uma ferramenta de programação agêntica da Anthropic que pode ler e editar arquivos e executar comandos no seu projeto. | V | Verdadeiro. Ele atua como um agente: entende a base de código, edita arquivos e roda comandos, sob seu controle. | fundamentals |
| B02 | O Claude Code só pode ser usado dentro do navegador. | F | Falso. Ele roda no terminal (CLI), em extensões de IDE como VS Code e JetBrains, no app desktop e na web. | fundamentals |
| B03 | Para usar o Claude Code é preciso ter uma assinatura do Claude ou uma conta com acesso à API da Anthropic. | V | Verdadeiro. O acesso é feito via planos do Claude (como Pro e Max, ou planos de equipe) ou via conta da Claude Console/API. | business |
| B04 | O Claude Code funciona apenas com projetos escritos em Python. | F | Falso. Ele trabalha com praticamente qualquer linguagem e tipo de projeto. | fundamentals |
| B05 | Por padrão, o Claude Code pede permissão antes de ações sensíveis, como editar arquivos ou executar comandos. | V | Verdadeiro. O modelo de permissões mantém você no controle; é possível ajustar o que exige aprovação. | security |
| B06 | O Claude Code consegue criar commits e abrir pull requests usando Git. | V | Verdadeiro. Ele opera Git e, com o GitHub CLI, pode abrir PRs com descrição gerada. | workflow |
| B07 | Usar o Claude Code elimina a necessidade de revisão humana do código. | F | Falso. Ele acelera o trabalho, mas a responsabilidade pelo código continua sendo do time; revisão humana segue essencial. | business |
| B08 | O Claude Code pode ser integrado ao GitHub Actions para automatizar tarefas em issues e pull requests. | V | Verdadeiro. Há integração oficial com GitHub Actions, acionável por menções em issues e PRs. | automation |
| B09 | O arquivo CLAUDE.md serve para dar ao Claude Code contexto e instruções persistentes sobre o projeto. | V | Verdadeiro. Ele é carregado automaticamente e guarda convenções, comandos e regras do projeto. | config |
| B10 | O Claude Code é um produto da OpenAI. | F | Falso. O Claude Code é desenvolvido pela Anthropic. | business |

#### Intermediário (uso no dia a dia) — 150 pts

| ID | Afirmação | Resp. | Explicação | Categoria |
|----|-----------|-------|------------|-----------|
| I01 | O comando /init analisa o projeto e gera um arquivo CLAUDE.md inicial. | V | Verdadeiro. É a forma recomendada de começar a documentar o projeto para o Claude. | commands |
| I02 | O comando /clear limpa o histórico da conversa atual, começando um contexto novo. | V | Verdadeiro. Útil ao trocar de tarefa para não carregar contexto irrelevante. | commands |
| I03 | O comando /compact apaga arquivos temporários do projeto para liberar espaço em disco. | F | Falso. O /compact resume a conversa para liberar espaço na janela de contexto; não mexe nos seus arquivos. | commands |
| I04 | No Plan mode, o Claude analisa o código e propõe um plano sem editar arquivos. | V | Verdadeiro. É ideal para explorar e alinhar a abordagem antes de qualquer mudança. | workflow |
| I05 | A flag -p (print) permite executar o Claude Code de forma não interativa, útil em scripts. | V | Verdadeiro. Ele processa o prompt, imprime a resposta e encerra — bom para pipelines. | automation |
| I06 | Slash commands personalizados podem ser criados como arquivos Markdown dentro da pasta .claude do projeto. | V | Verdadeiro. Comandos/skills em Markdown podem ser versionados e compartilhados com o time. | extensibility |
| I07 | O CLAUDE.md só pode existir na raiz do projeto; não há como ter instruções globais do usuário. | F | Falso. Também existe um CLAUDE.md no diretório do usuário (~/.claude/) com instruções para todos os projetos. | config |
| I08 | O comando claude --continue retoma a conversa mais recente do diretório atual. | V | Verdadeiro. E claude --resume permite escolher uma conversa anterior. | commands |
| I09 | Mencionar um arquivo com @ no prompt inclui esse arquivo no contexto da conversa. | V | Verdadeiro. É um jeito rápido de apontar exatamente o que o Claude deve ler. | workflow |
| I10 | O Claude Code não consegue analisar imagens, como screenshots coladas na conversa. | F | Falso. Ele aceita imagens, por exemplo um screenshot de erro ou um mockup de interface. | workflow |

#### Avançado (extensibilidade, automação, segurança) — 200 pts

| ID | Afirmação | Resp. | Explicação | Categoria |
|----|-----------|-------|------------|-----------|
| A01 | Hooks são comandos configurados nas settings que executam automaticamente em eventos como PreToolUse e PostToolUse. | V | Verdadeiro. Hooks garantem comportamentos determinísticos, como rodar um formatter após cada edição. | extensibility |
| A02 | Um hook PreToolUse pode bloquear a execução de uma ferramenta antes que ela aconteça. | V | Verdadeiro. O hook pode negar a chamada (por exemplo, via código de saída 2 ou decisão em JSON) e informar o motivo. | extensibility |
| A03 | O MCP (Model Context Protocol) permite conectar o Claude Code a ferramentas e fontes de dados externas. | V | Verdadeiro. Servidores MCP expõem ferramentas como bancos de dados, issue trackers e APIs. | extensibility |
| A04 | Servidores MCP só podem ser adicionados modificando o código-fonte do Claude Code. | F | Falso. Basta configurá-los, por exemplo com o comando claude mcp add ou um arquivo .mcp.json no projeto. | extensibility |
| A05 | Subagentes trabalham com uma janela de contexto própria, separada da conversa principal. | V | Verdadeiro. Isso permite delegar tarefas sem poluir o contexto principal. | extensibility |
| A06 | O arquivo .claude/settings.local.json foi feito para ser versionado no Git e compartilhado com todo o time. | F | Falso. Ele é para ajustes pessoais e não deve ser versionado; o compartilhado é o .claude/settings.json. | config |
| A07 | O Claude Agent SDK permite construir agentes próprios usando a mesma base que alimenta o Claude Code. | V | Verdadeiro. O SDK expõe o loop agêntico, ferramentas e gerenciamento de contexto para seus próprios agentes. | automation |
| A08 | Regras de permissão podem liberar ou negar comandos específicos, como Bash(npm run test:*). | V | Verdadeiro. Regras allow/deny/ask com padrões dão controle fino sobre o que roda sem pedir aprovação. | security |
| A09 | A flag --dangerously-skip-permissions é recomendada para o uso diário em máquinas com acesso à internet e dados sensíveis. | F | Falso. Ela pula todas as confirmações e só é indicada em ambientes isolados, como containers sem acesso à internet. | security |
| A10 | Git worktrees permitem rodar várias sessões do Claude Code em paralelo, em branches diferentes, sem que uma sobrescreva os arquivos da outra. | V | Verdadeiro. Cada worktree é um diretório de trabalho isolado do mesmo repositório. | workflow |

### 5.4 Formato do arquivo de conteúdo

Arquivo: `src/content/questions.json` (lido apenas no servidor). Esquema validado com Zod no build/test.

```json
{
  "version": 1,
  "questions": [
    {
      "id": "B01",
      "level": "beginner",
      "category": "fundamentals",
      "answer": true,
      "docUrl": "https://code.claude.com/docs/en/overview",
      "statement": {
        "pt-BR": "O Claude Code é uma ferramenta ...",
        "en": "Claude Code is an agentic coding tool ...",
        "de": "Claude Code ist ein agentisches Coding-Tool ..."
      },
      "explanation": {
        "pt-BR": "Verdadeiro. ...",
        "en": "True. ...",
        "de": "Wahr. ..."
      }
    }
  ]
}
```

Regras de validação (teste automatizado obrigatório):
- `id` único; 10 perguntas por nível; todos os 3 locales preenchidos em `statement` e `explanation`.
- `explanation` começa com "Verdadeiro."/"Falso." (pt-BR), "True."/"False." (en), "Wahr."/"Falsch." (de) coerente com `answer`.
- `docUrl` é HTTPS.

---

## 6. Arquitetura técnica

### 6.1 Stack
| Camada | Escolha |
|--------|---------|
| Framework | **Next.js** (versão estável mais recente, App Router, React Server Components) |
| Linguagem | **TypeScript** (`strict: true`) |
| Estilo | **Tailwind CSS** + componentes próprios (shadcn/ui permitido) |
| i18n | **next-intl** (pt-BR, en, de) |
| Banco | **Postgres serverless** (Neon via integração Vercel) |
| ORM | **Prisma** |
| Validação | **Zod** (input das APIs e esquema do conteúdo) |
| Testes | **Vitest** (unit) + **Playwright** (e2e) |
| Qualidade | ESLint + Prettier, `pnpm` como package manager |
| Deploy | **Vercel** (preview por PR, produção na `main`) |
| Rate limit | Tabela no Postgres (janela deslizante por hash de IP) — sem serviço extra no MVP |
| Animação | CSS/Tailwind; framer-motion opcional |

### 6.2 Visão de arquitetura

```
Browser (React client components)
   │  fetch JSON
   ▼
Next.js Route Handlers (/api/*)  ── lê ──►  src/content/questions.json (server-only)
   │  Prisma
   ▼
Postgres (Neon) : GameSession, GameAnswer, LeaderboardEntry, RateLimitHit
```

- Lógica de jogo e pontuação em `src/server/game/*` (funções puras, 100% testáveis).
- Módulo de conteúdo `src/server/content.ts` com `import 'server-only'`.

### 6.3 Estrutura de pastas

```
/
├─ CLAUDE.md
├─ prisma/schema.prisma
├─ messages/{pt-BR,en,de}.json        # strings de UI (next-intl)
├─ src/
│  ├─ app/[locale]/
│  │  ├─ page.tsx                     # Home
│  │  ├─ play/[gameId]/page.tsx       # Partida
│  │  ├─ result/[gameId]/page.tsx     # Resultado
│  │  ├─ leaderboard/page.tsx         # Ranking
│  │  └─ how-it-works/page.tsx
│  ├─ app/api/
│  │  ├─ games/route.ts                       # POST
│  │  ├─ games/[id]/route.ts                  # GET estado
│  │  ├─ games/[id]/answer/route.ts           # POST
│  │  └─ leaderboard/route.ts                 # GET, POST
│  ├─ components/ (QuestionCard, Timer, AnswerButtons, Feedback, ScoreBar, LevelCard, LanguageSwitcher, LeaderboardTable, ThemeToggle)
│  ├─ content/questions.json
│  ├─ i18n/ (routing.ts, request.ts)
│  ├─ lib/ (db.ts, zod-schemas.ts, profanity.ts, rate-limit.ts, ip-hash.ts)
│  └─ server/ (content.ts, game/{draw.ts, scoring.ts, session.ts})
├─ tests/unit/  tests/e2e/
└─ docs/decisions.md
```

### 6.4 Modelo de dados (Prisma)

```prisma
enum Level { BEGINNER INTERMEDIATE ADVANCED MIXED }
enum GameStatus { IN_PROGRESS FINISHED EXPIRED }

model GameSession {
  id            String      @id @default(cuid())
  level         Level
  locale        String
  questionIds   String[]
  currentIndex  Int         @default(0)
  score         Int         @default(0)
  correctCount  Int         @default(0)
  streak        Int         @default(0)
  bestStreak    Int         @default(0)
  totalTimeMs   Int         @default(0)
  status        GameStatus  @default(IN_PROGRESS)
  ipHash        String
  startedAt     DateTime    @default(now())
  finishedAt    DateTime?
  answers       GameAnswer[]
  leaderboard   LeaderboardEntry?
  @@index([status, startedAt])
}

model GameAnswer {
  id          String      @id @default(cuid())
  gameId      String
  game        GameSession @relation(fields: [gameId], references: [id], onDelete: Cascade)
  questionId  String
  order       Int
  servedAt    DateTime
  answeredAt  DateTime?
  answer      Boolean?    // null = tempo esgotado
  isCorrect   Boolean?
  timeMs      Int?
  points      Int         @default(0)
  @@unique([gameId, order])
}

model LeaderboardEntry {
  id           String      @id @default(cuid())
  gameId       String      @unique
  game         GameSession @relation(fields: [gameId], references: [id], onDelete: Cascade)
  nickname     String
  level        Level
  score        Int
  correctCount Int
  totalTimeMs  Int
  createdAt    DateTime    @default(now())
  @@index([level, score(sort: Desc), createdAt])
}

model RateLimitHit {
  id        String   @id @default(cuid())
  key       String   // ex.: "games:<ipHash>"
  createdAt DateTime @default(now())
  @@index([key, createdAt])
}
```

### 6.5 Contrato da API

Todas as respostas em JSON. Erros: `{ "error": { "code": string, "message": string } }` com status HTTP adequado (400, 404, 409, 410, 429).

| Método/rota | Entrada | Saída | Regras |
|-------------|---------|-------|--------|
| `POST /api/games` | `{ level, locale }` | `{ gameId, total: 10, timePerQuestionSec: 30 }` | Sorteia perguntas; rate limit 20/h por IP |
| `GET /api/games/:id?locale=` | — | `{ status, index, total, score, streak, question?: { id, order, level, category, statement, remainingMs } }` | Se a pergunta atual ainda não foi servida, cria `GameAnswer` com `servedAt=now`. **Nunca** inclui `answer`/`explanation` |
| `POST /api/games/:id/answer` | `{ questionId, answer: boolean \| null, locale }` | `{ isCorrect, correctAnswer, explanation, docUrl, points, breakdown: { base, timeBonus, streakBonus }, score, streak, finished }` | Valida que `questionId` é a pergunta atual; idempotente (segunda resposta → 409); calcula tempo no servidor; avança índice; na 10ª marca `FINISHED` |
| `GET /api/games/:id/summary?locale=` | — | placar, acertos, tempo, bestStreak, por categoria, revisão completa | Só para `FINISHED` |
| `GET /api/leaderboard?level=&period=week\|all&limit=50` | — | `{ entries: [{ rank, nickname, score, correctCount, totalTimeMs, createdAt }] }` | Cache `s-maxage=30, stale-while-revalidate=60` |
| `POST /api/leaderboard` | `{ gameId, nickname }` | `{ rank }` | Partida `FINISHED` há ≤ 30 min; apelido válido e limpo; 1 por jogo (409); rate limit 10/h por IP |

Partidas `IN_PROGRESS` sem atividade por 2 h são marcadas `EXPIRED` (lazy, ao acessar, ou job agendado opcional).

### 6.6 Segurança e anti-fraude
- Respostas corretas e explicações nunca saem do servidor antes da resposta.
- Tempo medido no servidor; pontuação calculada só no servidor.
- `gameId` = cuid (não sequencial). Sem autenticação, aceita-se que um usuário determinado consiga jogar várias vezes — o ranking mostra a melhor partida por entrada, sem deduplicar por pessoa (MVP).
- Rate limit por hash de IP: `sha256(ip + IP_HASH_SALT)`; IP em texto puro nunca é salvo.
- Filtro de palavrões em pt/en/de + bloqueio de termos reservados ("anthropic", "admin", "claude" isolado).
- Headers de segurança (CSP básica, `X-Content-Type-Options`, `Referrer-Policy`) via `next.config`.
- Escape de apelidos na renderização (React já protege; nunca usar `dangerouslySetInnerHTML`).

### 6.7 Variáveis de ambiente
| Nome | Uso |
|------|-----|
| `DATABASE_URL` | Conexão Postgres (pooled) |
| `DIRECT_URL` | Conexão direta para migrações Prisma |
| `IP_HASH_SALT` | Salt do hash de IP |
| `NEXT_PUBLIC_SITE_URL` | URL pública (compartilhamento, metadata) |

Fornecer `.env.example` com os nomes (sem valores reais).

---

## 7. UX / UI

- **Mobile-first**; botões V/F grandes (mín. 48px de altura), lado a lado no desktop e empilhados em telas < 360px.
- Paleta neutra com um tom de destaque quente (terracota/laranja suave, remetendo à identidade do Claude **sem** usar logotipos ou marcas registradas da Anthropic).
- Estados: carregando (skeleton), erro de rede (mensagem + "Tentar de novo"), partida expirada (CTA para nova partida).
- Timer: barra que encolhe + número; últimos 5s mudam de cor e anunciam via `aria-live="polite"` uma única vez ("5 segundos restantes").
- Feedback: verde + ✓ + "Correto!" / vermelho + ✗ + "Incorreto"; explicação em card abaixo.
- Modo claro/escuro seguindo `prefers-color-scheme` com toggle manual.
- Respeitar `prefers-reduced-motion`.

## 8. Acessibilidade (WCAG 2.1 AA)
- Navegação completa por teclado, foco visível, ordem lógica.
- Contraste mínimo 4.5:1 para texto.
- Feedback de acerto/erro anunciado por leitor de tela (`aria-live`).
- `lang` do `<html>` acompanha o locale.
- Teste automatizado com `@axe-core/playwright` nas páginas principais.

## 9. Requisitos não funcionais
| Requisito | Meta |
|-----------|------|
| Performance | LCP < 2,5s em 4G; Lighthouse Performance ≥ 90 mobile |
| Latência API | p95 < 300ms para `/answer` |
| Disponibilidade | Herdada da Vercel/Neon (sem SLA próprio no MVP) |
| SEO | Metadata por locale, `hreflang`, Open Graph com imagem estática |
| Privacidade (LGPD/GDPR) | Sem dados pessoais além do apelido público; IP só em hash; aviso de privacidade curto no rodapé; sem cookies de rastreamento no MVP (apenas `NEXT_LOCALE` e tema) |
| Observabilidade | Vercel Analytics (sem cookies) + logs estruturados nas APIs |

## 10. Métricas / eventos
Eventos (Vercel Analytics custom events): `game_started {level, locale}`, `question_answered {level, correct, timedOut}`, `game_finished {level, score, correct}`, `leaderboard_submitted {level}`, `doc_link_clicked {questionId}`, `share_clicked`, `locale_changed {from, to}`.

## 11. Testes
- **Unit (Vitest)**: sorteio (sem repetição, distribuição do Misto), pontuação (base, bônus de tempo, sequência, teto de +50%, timeout), validação do conteúdo (seção 5.4), validação de apelido e filtro de palavrões.
- **Integração**: route handlers com banco de teste (Postgres em Docker ou Neon branch).
- **E2E (Playwright)**: partida completa em pt-BR; troca de idioma para en e de; timeout de uma pergunta (usar relógio controlado); registro no ranking; recarregar no meio da partida mantém estado; resposta não aparece no HTML/rede antes de responder.
- **A11y**: axe nas páginas Home, Play, Result, Leaderboard.

## 12. Convenções para o CLAUDE.md do projeto
- Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm db:studio`.
- Commits no padrão Conventional Commits, em inglês.
- Server-only: tudo em `src/server/**` e `src/content/**` nunca importado por client components.
- Strings de UI sempre via next-intl; nada hardcoded.
- Toda nova pergunta precisa das 3 traduções e passar no teste de conteúdo.

## 13. Plano de implementação (fases)

| Fase | Entrega | Critério de pronto |
|------|---------|--------------------|
| F1 — Fundação | Next.js + TS + Tailwind + ESLint/Prettier + Vitest + Playwright + next-intl com 3 locales + layout, header com seletor de idioma e tema + CLAUDE.md | `pnpm build` ok; troca de idioma funcionando |
| F2 — Conteúdo | `questions.json` com 30 perguntas × 3 idiomas + esquema Zod + teste de conteúdo | Teste de conteúdo verde |
| F3 — Motor do jogo | Prisma + schema + `draw.ts`, `scoring.ts`, `session.ts` + APIs de games | Unit tests de pontuação/sorteio verdes |
| F4 — UI do jogo | Home, Play (timer, V/F, feedback, atalhos), Result com revisão e compartilhar | E2E de partida completa verde |
| F5 — Ranking | APIs de leaderboard, validação de apelido, rate limit, página de ranking | E2E de registro no ranking verde |
| F6 — Polimento | A11y, SEO, headers de segurança, analytics, "Como funciona", páginas de erro | Lighthouse ≥ 90; axe sem violações graves |
| F7 — Deploy | Projeto Vercel + Neon, migrações, variáveis, README | Produção acessível e smoke test ok |

## 14. Critérios de aceite do MVP
1. Usuário escolhe nível e idioma, joga 10 perguntas com timer de 30s e vê explicação + link após cada resposta.
2. Pontuação segue exatamente a seção 4 e é calculada no servidor.
3. Inspecionar rede/HTML não revela a resposta antes de responder.
4. Resultado mostra placar, acertos, tempo, sequência, desempenho por categoria e revisão.
5. Jogador registra apelido válido e aparece no ranking do nível, com desempate correto.
6. Toda a UI e as 30 perguntas estão em pt-BR, en e de; pt-BR é o padrão.
7. Funciona em mobile (360px) e desktop; navegável por teclado.
8. Lint, typecheck, unit e e2e passam no CI; deploy na Vercel funcionando.

## 15. Fora de escopo (v1)
- Login/contas de usuário, perfis, histórico pessoal entre dispositivos.
- Painel admin / CMS para editar perguntas (edição via PR no JSON).
- Perguntas de múltipla escolha ou outros formatos.
- Certificados, badges, multiplayer em tempo real.
- Idiomas além de pt-BR, en e de.
- Geração de perguntas por IA em tempo de execução.

## 16. Riscos e mitigações
| Risco | Mitigação |
|-------|-----------|
| Conteúdo desatualizado (Claude Code evolui rápido) | Evitar fatos voláteis; campo `version` no JSON; revisão trimestral contra a doc oficial |
| Erro de tradução invertendo V/F | Teste de prefixo da explicação + revisão humana por falante nativo (en/de) |
| Fraude no ranking | Pontuação e tempo no servidor, rate limit, 1 entrada por partida; aceitar limite residual no MVP |
| Apelidos ofensivos | Filtro multilíngue + lista de termos reservados; remoção manual via banco (MVP) |
| Confusão com produto oficial | Aviso "não oficial / não afiliado à Anthropic"; sem logotipos da marca |
| Custos de banco | Neon free tier; índices adequados; cache curto no GET do ranking |

## 17. Roadmap pós-MVP (ideias)
- Expandir para 60–120 perguntas e rodadas maiores.
- Login opcional (GitHub) para ranking verificado e histórico.
- Modo "Desafio diário" com as mesmas 10 perguntas para todos.
- Painel admin para moderação de apelidos e estatísticas por pergunta (% de acerto).
- Imagem de resultado gerada (OG dinâmica) para compartilhar.
