**Visão Geral**
- **Propósito:** Repositório monorepo contendo serviços backend (TypeScript + Express + Prisma), frontends (Vite + React) e documentação/docker em `documentacao/`.
- **Principais subprojetos:** `lead-saas` (API principal SaaS), `lead-frontend` (UI React/Vite), `documentacao/marketing360_full` (exemplo/cliente com `backend` e `frontend`).

**Arquitetura (alto nível)**
- **Backend (TS/Express):** localizados em `lead-saas/` e `documentacao/marketing360_full/backend/` — usam `ts-node-dev` para desenvolvimento e `tsc` para build.
- **Persistência:** Prisma (`prisma/schema.prisma` em cada backend). O código usa `@prisma/client` e um `prisma.ts` que exporta `prisma = new PrismaClient()`.
- **Frontend:** Vite + React em `lead-frontend/` e `documentacao/marketing360_full/frontend/` — scripts padrão `dev`, `build`, `preview`.
- **Infra/Docker:** há `docker-compose.yml` em `documentacao/marketing360_base/docker/` e `documentacao/marketing360_full/infra/` para orquestrar serviços.

**Como iniciar localmente (exemplos)**
- **API `lead-saas` (dev):**
  - `cd lead-saas`
  - `npm install`
  - `npm run dev`  # usa `ts-node-dev` e observa `src/server.ts`
- **API `lead-saas` (build+start):**
  - `npm run build`
  - `npm start`
- **Frontend `lead-frontend`:**
  - `cd lead-frontend`
  - `npm install`
  - `npm run dev`  # abre Vite dev server
- **Marketing360 (exemplo):** veja `documentacao/marketing360_full/backend` e `/frontend` com scripts similares.
- **Prisma (quando aplicável):**
  - Gerar client: `npm run prisma:generate` (presente em `marketing360_full/backend`)
  - Migrar: `npm run prisma:migrate` (atenção: migrates podem exigir DB configurado e `DATABASE_URL` no `.env`).

**Padrões e convenções do projeto**
- **TypeScript + ts-node-dev no dev:** backends usam `ts-node-dev --respawn --transpile-only src/server.ts` para desenvolvimento rápido.
- **Estrutura de rotas:** `src/routes/*Routes.ts` — cada arquivo exporta um `Router` (ex.: `leadRoutes.ts`, `authRoutes.ts`). `src/server.ts` monta as rotas principais.
- **Prisma client centralizado:** `src/lib/prisma.ts` exporta `prisma` e é importado nos repositórios/serviços.
- **Autenticação:** JWT usado — `src/middlewares/authMiddleware.ts` (observação: código atualmente referencia um segredo embutido/placeholder; ver `process.env` para usar variáveis reais).
- **Token storage no frontend:** frontends guardam token em `localStorage` sob `authToken` e passam para requests.
- **Arquivos de configuração:** variáveis via `.env` + `dotenv` no servidor (procure `dotenv.config()` em `server.ts`).

**Padrões de integração e pontos importantes**
- **Webhooks / integrações:** `lead-saas` expõe rotas para `webhooks/forms`, `social/instagram`, `maps/google`, `corp/cnpj` — verificar `src/routes/*` para detalhes de payload.
- **Branding / White label:** há rotas de `branding` — úteis para customização multi-tenant.
- **Conexões externas:** possíveis dependências em Redis / filas (`bullmq`, `ioredis`) aparecem em `marketing360_full/backend` — se usar essas features, configure serviços externos.

**Scripts úteis e arquivos para editar**
- **Editar e rodar:** `lead-saas/package.json` (`dev`, `build`, `start`).
- **Frontend Vite:** `lead-frontend/package.json` (`dev`, `build`, `preview`).
- **Exemplo backend com Prisma:** `documentacao/marketing360_full/backend/package.json` (`prisma:generate`, `prisma:migrate`).

**Recomendações práticas para o agente (copilot / AI coding agent)**
- **Priorize alterações pequenas e localizadas:** siga a estrutura `src/routes/*`, `src/controllers/*`, `src/services/*` quando existir.
- **Ao tocar em Prisma:** sempre procurar `prisma/schema.prisma` correspondente e atualizar `prisma generate` após alterações de schema.
- **Checar `.env` antes de rodar:** muitos scripts exigem `DATABASE_URL`, `PORT`, `JWT_SECRET` — ver `dotenv.config()` nos servidores.
- **Ao modificar autenticação:** procure `src/middlewares/authMiddleware.ts` e exemplos de uso em rotas `protected` (rotas que leem `req.user`).
- **Não assumir DB local:** scripts de migrate podem falhar sem banco; prefira instruir o humano a prover `DATABASE_URL` ou usar Docker compose em `documentacao/marketing360_base/docker/`.

**Onde olhar primeiro (arquivos chave)**
- `lead-saas/src/server.ts` — ponto de entrada do backend SaaS.
- `lead-saas/src/lib/prisma.ts` — cliente Prisma compartilhado.
- `lead-saas/src/middlewares/authMiddleware.ts` — política de autenticação JWT.
- `lead-frontend/src/App.tsx` — fluxo de autenticação + armazenamento do token.
- `documentacao/marketing360_full/backend/package.json` — exemplos de scripts Prisma + infra adicional.
- `documentacao/marketing360_base/docker/docker-compose.yml` e `documentacao/marketing360_full/infra/docker-compose.yml` — orquestração de serviços.

Se quiser, eu posso:
- aplicar este arquivo (`.github/copilot-instructions.md`) no repositório agora (faço o commit local),
- ou gerar uma versão estendida com exemplos de PRs e mensagens de commit.

Por favor me diga se quer que eu crie o arquivo aqui no repositório agora ou ajuste algo neste rascunho.
