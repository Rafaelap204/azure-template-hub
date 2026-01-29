## Mudanças no banco (Supabase)
- Criar uma nova migration em `supabase/migrations/` adicionando:
  - **Tabela `public.users`**
    - `id uuid primary key default gen_random_uuid()`
    - `email text unique not null`
    - `created_at timestamptz not null default now()`
    - `updated_at timestamptz not null default now()`
  - **Tabela `public.user_sessions`** (rastreamento opcional)
    - `id uuid primary key default gen_random_uuid()`
    - `user_id uuid not null references public.users(id) on delete cascade`
    - `login_at timestamptz not null default now()`
    - `ip_address text`

## RLS e políticas
- Habilitar RLS em `public.users` e `public.user_sessions`.
- `public.users`:
  - `SELECT`: permitir apenas quando `auth.uid() = id`.
  - `UPDATE`: permitir apenas quando `auth.uid() = id` (e `with check` equivalente).
  - `INSERT`: **sem policy** (bloqueado para clientes; apenas service_role/DB admin consegue inserir).
  - `DELETE`: **sem policy** (bloqueado para clientes).
- `public.user_sessions`:
  - `SELECT`: permitir apenas quando `auth.uid() = user_id`.
  - `INSERT`: permitir apenas quando `auth.uid() = user_id`.
  - `UPDATE/DELETE`: sem policy.

## Sincronização com Supabase Auth (sem signup público)
- Adicionar trigger em `auth.users` (AFTER INSERT) para criar automaticamente o registro correspondente em `public.users` com `id = NEW.id` e `email = NEW.email`.
  - Isso atende o requisito “INSERT apenas via função/trigger autorizada” e garante que `auth.uid()` corresponda ao `public.users.id`.
- Criar trigger `BEFORE UPDATE` em `public.users` usando a função existente `public.update_updated_at_column()` (já presente na migration de `templates`).

## Configuração do Supabase Auth (settings)
- Desativar **signup público** no painel do Supabase.
- Habilitar login por **Magic Link/OTP** para o email autorizado.
- Criar o usuário único no Supabase Auth (via dashboard) com o email permitido (ou via admin API) — o trigger acima cria o row em `public.users` automaticamente.

## Mudanças no frontend (login simplificado)
- Atualizar [useAuth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/hooks/useAuth.tsx) e [Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx):
  - Remover fluxo de cadastro (`signUp`) e o toggle “Criar Conta”.
  - Implementar `signInWithOtp` (Magic Link) e UX de confirmação (“enviamos um link para seu email”).
  - Restringir o login ao **email único** (ex.: `VITE_ALLOWED_LOGIN_EMAIL` no `.env`) e bloquear qualquer outro email com mensagem clara.

## Ajuste visual da logo (sem fundo)
- Atualizar o `img src` no [Logo.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/Logo.tsx) para:
  - `https://i.ibb.co/jZhvsgzC/Design-sem-nome-2026-01-28-T140451-007-removebg-preview.png`
- Atualizar o `alt` para descrever corretamente a versão sem fundo (“… removebg preview”).
- Manter a âncora `href="https://imgbb.com/"` e o fallback local.

## Validação
- Rodar build (`npm run build`) e testes (`npm test`).
- Verificar no browser:
  - Login: envio de Magic Link/OTP, bloqueio para emails não autorizados.
  - Dashboard: acesso somente após sessão válida.
  - Logo: sem fundo branco visível e com proporção preservada.
  - Verificar RLS: queries diretas ao PostgREST/Supabase client só retornam dados do próprio usuário.