## Contexto (o que existe hoje)
- O banco hoje está definido por migrations em `supabase/migrations/` (ex.: `public.templates` em [20260128154822…sql](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/supabase/migrations/20260128154822_f524945f-fbc2-47dc-a879-621e58f098b1.sql)).
- As tabelas novas (`public.users` e `public.user_sessions`) já têm script de migration em [20260128170000_single_email_auth.sql](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/supabase/migrations/20260128170000_single_email_auth.sql), mas **ainda não foram aplicadas** no seu ambiente.
- Não existe hoje nenhuma funcionalidade/campo de “visibilidade pública” na UI nem no modelo (confirmado pela varredura e pelos tipos gerados em [types.ts](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/integrations/supabase/types.ts)).

## 1) Criação das tabelas (com scripts, FKs, constraints, índices)
### Tabelas necessárias para o sistema atual
1. **`public.templates`** (já existe)
   - Campos: `id`, `user_id` (FK para `auth.users(id)`), `name`, `category`, `content`, `variables`, `based_on_template_id`, `created_at`, `updated_at`.
   - Índices a adicionar (otimização do dashboard):
     - `templates_user_id_updated_at_idx` em `(user_id, updated_at desc)`.
     - Opcional: índice para `based_on_template_id`.

2. **`public.users`** (necessária para manter perfil/controle interno)
   - Campos conforme requisitado: `id uuid pk default gen_random_uuid()`, `email unique not null`, `created_at`, `updated_at`.
   - Índice: `users_email_idx` (o `unique` já cria, mas mantemos explícito se necessário).

3. **`public.user_sessions`** (opcional de rastreamento)
   - Campos conforme requisitado: `id uuid pk default gen_random_uuid()`, `user_id` (FK para `public.users(id)`), `login_at`, `ip_address`.
   - Índices:
     - `user_sessions_user_id_login_at_idx` em `(user_id, login_at desc)`.

4. **Nova tabela para “visibilidade pública” (necessária porque não existe hoje)**
   - **`public.app_settings`** (single-row) para persistir o estado do toggle:
     - `id uuid pk default gen_random_uuid()`
     - `public_access_enabled boolean not null default false`
     - `updated_at timestamptz not null default now()`
   - Inserção inicial: criar 1 row padrão.

### Entrega dos scripts
- Criar uma migration nova (ex.: `20260128xxxxxx_public_visibility.sql`) que:
  - Garante `public.users` e `public.user_sessions` (se ainda não existirem) e adiciona os índices.
  - Cria `public.app_settings` + índices.
  - Ajusta `public.templates` para adicionar os índices.

## 2) RLS/políticas e integridade
- Ativar RLS em todas as tabelas (`templates`, `users`, `user_sessions`, `app_settings`).
- `public.users`:
  - `SELECT/UPDATE` apenas para o próprio usuário (`auth.uid() = id`).
  - `INSERT/DELETE` negados para clientes (sem policy).
- `public.user_sessions`:
  - `SELECT/INSERT` apenas do próprio usuário (`auth.uid() = user_id`).
- `public.app_settings`:
  - `SELECT/UPDATE` **somente para o admin** (email `admgestalt@gmail.com`), usando claim do JWT (via `auth.jwt()`), mantendo as policies restritas ao papel `authenticated`.
- Para "acesso público":
  - Criar uma policy em `public.templates` **somente para SELECT do role `anon`** que libera leitura quando `public_access_enabled = true`.
  - Manter `INSERT/UPDATE/DELETE` sempre restritos ao usuário autenticado.

## 3) Implementar toggle de visibilidade pública na UI
- Adicionar no dropdown do usuário no [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx) um item "Acesso público" com um [Switch](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/ui/switch.tsx).
- Criar um hook/serviço (ex.: `useAppSettings`) para:
  - Buscar o row de `public.app_settings`.
  - Atualizar `public_access_enabled` ao alternar o switch.
- UI deve mostrar claramente o estado atual (Ativado/Desativado) e tratar loading/erro.

## 4) Execução no ambiente de desenvolvimento e validação
- Aplicar migrations no dev:
  - Preferencial: Supabase CLI (`npx supabase start` + `npx supabase db reset`) para aplicar tudo localmente.
  - Alternativa: colar o SQL no SQL Editor do Supabase (projeto `ddyzkzzwqowqitzebwev`) e executar.
- Validar a estrutura criada:
  - Conferir existência de tabelas/colunas/FKs/índices.
  - Verificar RLS habilitado e policies ativas.
- Testes de cenários:
  - Usuário autenticado (admin) consegue ver e alternar `app_settings`.
  - Usuário autenticado comum (se existir) não consegue alterar `app_settings`.
  - Usuário não autenticado só consegue ler templates quando toggle está ON.

## 5) Onde desativar “público” no Supabase Auth (caso seja signup público)
- No Supabase existe a configuração **“Allow new users to sign up”** (se desativar, só usuários existentes conseguem entrar). Documentação oficial: https://supabase.com/docs/guides/auth/general-configuration
- Se você não está vendo na UI do dashboard, eu adiciono uma proteção equivalente do lado do banco via trigger em `auth.users` (bloqueando criação de usuário exceto o admin) como defesa extra.

## 6) Relatório final
- Entregar um relatório com:
  - Tabelas criadas/alteradas + campos + índices + constraints.
  - Policies RLS aplicadas.
  - Evidências de validação (queries de verificação + comportamento do toggle em cenários anon/auth).
  - Instruções curtas para repetir o setup em outro ambiente.