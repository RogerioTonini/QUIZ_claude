# Decisões de projeto

Registro de decisões não cobertas (ou interpretadas) a partir do PRD (`.llm/prd.md`).

| # | Data | Decisão | Motivo |
|---|------|---------|--------|
| D01 | 2026-10-16 | Banco de dev e testes: Neon, com branches `dev` e `test`; na CI, Postgres como service container do GitHub Actions. | A máquina de desenvolvimento não tem Docker. |
| D02 | 2026-10-16 | Fluxo Git: um branch e um PR por fase do PRD (§13). | Revisão incremental. |
| D03 | 2026-10-16 | A tolerância de +2s serve só para decidir se o tempo esgotou; o bônus de tempo usa o tempo real, `remaining = max(0, 30s − elapsed)`. | Evita bônus negativo e mantém a fórmula da §4. |
| D04 | 2026-10-16 | Trocar o idioma no meio da partida recarrega a pergunta atual no novo locale (`?locale=`). | RF02 permite `locale` em cada chamada. |
| D05 | 2026-10-16 | Ranking "Semana" = últimos 7 dias corridos (UTC). | Mais simples que a semana-calendário e sem ambiguidade de fuso. |
| D06 | 2026-10-16 | Partidas expiram só de forma lazy (ao acessar), sem job agendado no MVP. | O PRD §6.5 marca o job como opcional. |
| D07 | 2026-10-16 | O PDF de `docs_projeto/` não é versionado (`.gitignore`). | Binário grande, que não faz parte do produto. |
| D08 | 2026-10-16 | pnpm instalado via `npm i -g pnpm@10`. | `corepack enable` exige permissão de administrador nesta máquina. |
