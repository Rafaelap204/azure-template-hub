# Relatório — Tabelas, RLS e Controle de Visibilidade Pública

## Escopo
- Criar/entregar scripts SQL (migrations) para as tabelas necessárias do sistema.
- Implementar controle de “Acesso público” persistido no banco e exposto na UI.
- Garantir Row Level Security (RLS) e políticas coerentes.

## Visão geral das migrations
Ordem (por timestamp) em `supabase/migrations/`:
- `20260128154822_f524945f-fbc2-47dc-a879-621e58f098b1.sql` — `public.templates` + RLS + função `public.update_updated_at_column()`.
- `20260128170000_single_email_auth.sql` — `public.users` + `public.user_sessions` + RLS + trigger de sync `auth.users -> public.users`.
- `20260128173000_public_visibility_and_indexes.sql` — `public.app_settings` + índices adicionais.
- `20260128173100_public_visibility_policies.sql` — função `public.is_public_access_enabled()` + policies do admin e do acesso público (anon).
- `20260128173200_restrict_auth_signups.sql` — trigger que bloqueia criação de usuários fora do admin (defesa extra).

## Tabelas e estrutura

### 1) `public.templates` (já existente)
Finalidade: armazenar templates utilitários do WhatsApp por usuário.

Campos principais:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `category text not null default 'utility'`
- `content text`
- `variables jsonb default '[]'::jsonb`
- `based_on_template_id uuid references public.templates(id) on delete set null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Índices adicionados:
- `templates_user_id_updated_at_idx` em `(user_id, updated_at desc)` — otimiza o dashboard (lista por usuário e ordenação por atualização).
- `templates_based_on_template_id_idx` em `(based_on_template_id)` — otimiza leitura de templates derivados.

RLS/policies:
- `SELECT/INSERT/UPDATE/DELETE` do próprio usuário (`auth.uid() = user_id`) — já existia.
- `SELECT` para `anon` (sem login) apenas quando o acesso público global estiver ativado:
  - policy: “Public can view templates when public access enabled”.

### 2) `public.users`
Finalidade: tabela de perfil/controle interno (espelha `auth.users` por trigger).

Campos:
- `id uuid pk default gen_random_uuid()`
- `email text unique not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

RLS/policies:
- `SELECT` apenas do próprio usuário (`auth.uid() = id`).
- `UPDATE` apenas do próprio usuário (`auth.uid() = id`).
- `INSERT/DELETE`: sem policy (bloqueado para clientes; apenas admin/service_role/trigger).

### 3) `public.user_sessions` (opcional)
Finalidade: rastrear sessões/logins.

Campos:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references public.users(id) on delete cascade`
- `login_at timestamptz default now()`
- `ip_address text`

Índice adicionado:
- `user_sessions_user_id_login_at_idx` em `(user_id, login_at desc)`

RLS/policies:
- `SELECT` apenas do próprio usuário (`auth.uid() = user_id`).
- `INSERT` apenas do próprio usuário (`auth.uid() = user_id`).
- `UPDATE/DELETE`: sem policy (bloqueado para clientes).

### 4) `public.app_settings` (nova)
Finalidade: persistir o estado do toggle de “Acesso público”.

Campos:
- `id uuid pk default gen_random_uuid()`
- `singleton boolean not null default true unique` (garante single-row)
- `public_access_enabled boolean not null default false`
- `updated_at timestamptz default now()`

Trigger:
- `update_app_settings_updated_at` para manter `updated_at` atualizado.

RLS/policies:
- `SELECT/UPDATE` apenas para o admin (baseado no claim `email` do JWT):
  - `auth.jwt() ->> 'email' = 'admgestalt@gmail.com'`
- `INSERT/DELETE`: sem policy (bloqueado para clientes).

Função auxiliar:
- `public.is_public_access_enabled()` (security definer, stable) retorna o boolean atual da tabela.

## Controle de “Visibilidade Pública” na UI
- Implementado no menu do usuário no Dashboard:
  - Toggle “Acesso público” (somente aparece para `admgestalt@gmail.com`).
  - Atualiza `public.app_settings.public_access_enabled`.
  - Mostra feedback via toast (ativado/desativado).

Arquivo principal:
- `src/pages/Dashboard.tsx`

## “Público” no Supabase Auth (signup)
Se a sua dúvida sobre “público” era **cadastro público** (qualquer pessoa conseguir criar usuário):
- No Supabase existe a configuração “Allow new users to sign up” no módulo de Auth (configuração geral).
- Como defesa extra no banco, foi adicionada uma trigger que bloqueia inserções em `auth.users` para qualquer email diferente de `admgestalt@gmail.com`.

## Como aplicar as migrations (ambiente de desenvolvimento)

### Opção A — Local (recomendado) com Supabase CLI
Pré-requisito: Docker Desktop instalado e funcionando.

Comandos (Windows):
- `npx.cmd --yes supabase start`
- `npx.cmd --yes supabase db reset`

### Opção B — Projeto hospedado (Supabase Dashboard)
No SQL Editor, execute as migrations **na ordem** listada acima.

## Validação e testes
- `npm test` inclui um teste que valida a presença de DDL/policies nos arquivos SQL:
  - `src/test/migrations.test.ts`
- `npm run build` concluído com sucesso.

Observação: a execução do `supabase start` falha quando o Docker Desktop não está disponível no ambiente.
