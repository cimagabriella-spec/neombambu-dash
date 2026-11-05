# NEOBAMBU · Content Approval Hub

Plataforma de gestão editorial e aprovação de conteúdos da NEOBAMBU.
React 18 · TypeScript · Tailwind CSS · componentes no padrão shadcn/ui · Lucide · Supabase.

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173
```

Sem variáveis de ambiente, a aplicação abre em **Modo demonstração**: perfis fictícios
(Marketing, Diretoria, Admin), dados de exemplo e persistência apenas no IndexedDB do
navegador. Uma faixa no topo deixa isso explícito o tempo todo.

## Ativar o backend real (Supabase)

1. Crie um projeto em supabase.com.
2. Aplique a migração `supabase/migrations/20261105000000_init.sql`
   (`supabase db push` ou cole o arquivo no SQL Editor). Ela cria tabelas, RLS,
   triggers de versionamento, RPCs de aprovação, buckets privados e o Realtime.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Convide os usuários em Authentication › Users. Novas contas entram **sem papel**
   (sem acesso) até que um administrador as libere. Promova o primeiro admin no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'voce@neobambu.com.br';
   ```
   Os papéis dos demais usuários também são definidos por SQL (`role` = `marketing` ou `diretoria`).

## Regras de negócio (aplicadas no banco)

| Regra | Onde |
|---|---|
| Só Marketing/Admin criam e editam; só Diretoria/Admin aprovam ou pedem ajustes | RLS + `has_role()` nas RPCs |
| Status muda apenas via RPC (`submit_content`, `approve_contents`, `request_changes`, `set_content_status`) | trigger `contents_before_update` |
| Editar uma versão já enviada gera nova versão; se estava aprovada, volta para "Aguardando aprovação" | trigger `contents_before_update` |
| Data/horário e observações internas não exigem nova aprovação (ficam no histórico) | `rescheduled` em `approval_events` |
| Aprovação em lote é atômica e valida a versão de cada item | `approve_contents(jsonb)` |
| Solicitar ajustes exige justificativa | `request_changes` |
| Conteúdo publicado é imutável e não pode ser excluído | trigger + política de DELETE |
| Comentários não são editáveis; só podem ser resolvidos/reabertos | trigger `comments_before_write` |

Teste dessas regras em Postgres embarcado (PGlite, com stubs de auth/storage):

```bash
npm run test:sql
```

## O que depende de configuração adicional (não simulado como pronto)

- **E-mail**: notificações já são gravadas em `email_outbox`; falta uma Edge Function com um
  provedor (Resend, SES, SMTP) para enviá-las.
- **Publicação automática nas redes**: não implementada (exige apps aprovados na Meta e no LinkedIn).
- **Alertas agendados**: `refresh_due_notifications()` roda quando o app carrega; para alertas sem
  ninguém online, agende-a com `pg_cron`.
- **Identidade visual**: cores são tokens em `src/index.css`. O wordmark em `components/content/bits.tsx` é provisório —
  substitua pelo SVG oficial.
- **Artes de demonstração** são SVGs gerados (texturas de madeira/bambu), não fotografias da marca.

## Estrutura

```
src/
  lib/workflow.ts           regras de permissão e versionamento (espelho do SQL)
  lib/data/                 DataProvider · demo (IndexedDB) · supabase
  components/preview/       previews Instagram (feed, carrossel, reels, stories) e LinkedIn (desktop/mobile)
  components/comments/      comentários por versão, respostas, resolvidos, pins na imagem
  pages/                    Calendário, Conteúdos (lista e página do conteúdo), Aprovações
supabase/migrations/        schema, RLS, triggers, RPCs, storage
scripts/test-sql.mjs        testes do backend
```
