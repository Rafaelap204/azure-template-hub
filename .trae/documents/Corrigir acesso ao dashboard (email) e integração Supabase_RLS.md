## Diagnóstico (o que encontrei no código)
- Não existe implementação/referência a tabelas BOM (Bill of Materials) no repositório; o app atual usa principalmente `public.templates`, `public.app_settings`, `public.users` e `public.user_sessions`.
- O “email no dashboard” vem de `user?.email` (objeto do Supabase Auth) em [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx#L163-L171). Se `user` não carregar corretamente, o dashboard redireciona para `/auth`.
- Há um ponto crítico de inconsistência banco↔frontend: o dashboard atualiza `app_settings` com `.eq('singleton', true)` [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx#L108-L112), mas isso só funciona se a tabela tiver a coluna `singleton` (como na migration [20260128173000...](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/supabase/migrations/20260128173000_public_visibility_and_indexes.sql#L1-L6)). Se você rodou um SQL “simplificado” que criou `app_settings` sem `singleton`, o update falha e pode quebrar a experiência do dashboard.
- As migrations também assumem que `public.templates` já existe (índices/policies) e que a função `public.update_updated_at_column()` existe. Se o SQL foi executado fora de ordem, ocorrem erros como “relation public.templates does not exist”.
- Erros de RLS e de schema são parcialmente “engolidos” pela UI (ex.: `fetchTemplates` ignora `error`, `fetchPublicAccess` ignora erro), o que dificulta identificar por que o dashboard não funciona.

## Plano de correção (o que vou implementar)
### 1) Tornar as migrations resilientes e compatíveis com execução manual
- Ajustar as migrations SQL para serem idempotentes e não quebrarem quando `templates` ainda não existe:
  - Criar `public.templates` na primeira migration (se ainda não existir) ou proteger índices/policies com `to_regclass(...)`.
  - Garantir que `public.update_updated_at_column()` exista antes de qualquer `CREATE TRIGGER` que a use.
  - Garantir que `public.app_settings` contenha `singleton boolean unique` e que exista exatamente 1 linha (com `singleton=true`).

### 2) Corrigir o fluxo do dashboard para não “falhar silenciosamente”
- No frontend:
  - Exibir toast/erro claro quando `templates` falhar por RLS/permitẽo ou tabela inexistente.
  - Exibir toast/erro claro quando `app_settings` falhar por coluna inexistente/RLS.
  - Tornar o update do toggle mais robusto: buscar o `id` do registro singleton e atualizar por `id` (evita dependência frágil do filtro e melhora mensagem de erro).
  - Bloquear criação de template se `user` estiver ausente (evita inserir `user_id: undefined`).

### 3) Verificar/ajustar permissões RLS para o caso “admin por email”
- Manter a regra do admin `admgestalt@gmail.com`, mas:
  - Melhorar as policies para também cobrir `INSERT` no `app_settings` (se necessário) e padronizar checagem.
  - (Opcional, se necessário) substituir a checagem direta no JWT por uma função `public.is_admin()` para centralizar e facilitar manutenção.

## Validação
- Validar localmente: navegação `/auth -> /dashboard`, exibição de `user.email`, listagem de templates e comportamento do toggle.
- Validar banco: `templates`, `app_settings`, RLS habilitado, policies ativas, e consultas com `anon`/`authenticated` conforme esperado.

Se você confirmar, eu faço as alterações no SQL/migrations e no React, e deixo mensagens de erro claras no dashboard para você enxergar qualquer problema de permissão/schema imediatamente.