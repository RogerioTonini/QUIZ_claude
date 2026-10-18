# Pendências para finalizar o projeto

Situação em 18/10/2026. As fases F1–F7 estão mergeadas na `main` e a produção está em https://quiz-claude-five.vercel.app. Os itens abaixo impedem dar o MVP como concluído pelos critérios do PRD (§9, §13 e §14).

## Impeditivos

### 1. URLs de produção apontam para `http://localhost:3000`

**Situação:** o build em produção foi feito com `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Com isso:

- o canonical, o `hreflang` e o `og:image` de todas as páginas apontam para `localhost` (SEO, PRD §9);
- o link de compartilhar o resultado leva a `http://localhost:3000/...` e não abre para quem recebe (entrega da F4).

O código está correto: nenhum arquivo versionado define a variável, e sem ela o app usa o domínio de produção (D40). O valor errado está no ambiente da Vercel. Mesmo depois da correção da variável e de um redeploy, uma página gerada na hora ainda saiu com `localhost`, e o JavaScript do link de compartilhar continuou idêntico (`1-fdtq94eodfu.js`).

**Como resolver:**

1. Na Vercel, em _Settings → Environment Variables_, deixe `NEXT_PUBLIC_SITE_URL` em _Production_ como `https://quiz-claude-five.vercel.app`, ou apague a variável. Procure também uma segunda entrada com o mesmo nome e variáveis compartilhadas do time.
2. Se apagar, confirme que _Automatically expose System Environment Variables_ está ligado. Sem essa opção, `VERCEL_PROJECT_PRODUCTION_URL` não existe no build e o app cai no fallback `localhost`.
3. Faça o redeploy do deploy de produção com _Use existing Build Cache_ **desmarcado**. Variáveis `NEXT_PUBLIC_*` só entram no código no build.
4. Confira em _Deployments_ que o deploy novo é o _Current_ de Production.

**Como verificar:** o código-fonte de `https://quiz-claude-five.vercel.app/pt-BR` deve ter `<link rel="canonical" href="https://quiz-claude-five.vercel.app/pt-BR"/>`, e o link de compartilhar de uma partida terminada deve abrir em outro navegador.

### 2. Lighthouse Performance ≥ 90 (mobile) não atingido

**Situação:** a meta vem da F6 e do PRD §9, e o D38 adiou a medição para a Vercel. As medições contra produção, em 18/10/2026, foram feitas nesta máquina (benchmark 835, lenta, com a CPU simulada 4× mais lenta):

| Página        | Performance | LCP        | TBT          |
| ------------- | ----------- | ---------- | ------------ |
| Home (3×)     | 81 / 84 / 88 | 1,7–2,6 s | 470–600 ms   |
| Ranking       | 85          | 1,5 s      | 580 ms       |
| Como funciona | 92          | 1,5 s      | 350 ms       |

Acessibilidade 100 e boas práticas 100 em todas as páginas. SEO 91, pela falha do item 1. CLS 0. O que derruba a nota é o TBT: o chunk principal do React/Next leva cerca de 970 ms de execução. Uma das rodadas da Home teve LCP de 2,6 s, acima da meta de 2,5 s.

A máquina lenta infla o TBT, então essa nota pode ser pior que a real. Uma tentativa pelo PageSpeed Insights (servidores do Google) foi recusada com 429, por falta de chave da API.

**Como resolver:**

1. Depois de corrigir o item 1, medir a Home, o Ranking e o Como funciona em https://pagespeed.web.dev (mobile).
2. Se a Home ficar ≥ 90, registrar o resultado no D38 e fechar o item.
3. Se ficar abaixo, reduzir o JavaScript que roda na carga inicial da Home. Primeiro, ver quais client components entram nela (header, seletor de idioma e de tema, analytics) e se algum pode virar Server Component ou carregar depois. Medir de novo depois de cada mudança.

## A verificar (sem medição até agora)

### 3. Latência da API: p95 < 300 ms para `/answer` (PRD §9)

Nunca foi medida. Cada requisição grava `durationMs` nos logs estruturados (D35). Dá para tirar o p95 de `POST /api/games/[id]/answer` nos logs da Vercel depois de algumas partidas reais.

### 4. Revisão do conteúdo antes do release

Os 20 `docUrl` distintos das perguntas respondem 200 (`node scripts/check-doc-urls.mts`, 18/10/2026). Faltam duas revisões que precisam de uma pessoa:

- conferir os fatos das 30 perguntas contra https://code.claude.com/docs (CLAUDE.md, regras de conteúdo);
- revisão das traduções en e de por falante nativo, para não inverter V/F (PRD §16).

## Já verificado

- CI (lint, typecheck, unit, integração e E2E com axe) passa na `main`.
- O smoke test passou contra o build local e contra produção (18/10/2026).
- Testes manuais em ambiente local e na Vercel, feitos pelo usuário.
- Todas as branches de desenvolvimento foram mergeadas e apagadas; sobra só a `main`.
