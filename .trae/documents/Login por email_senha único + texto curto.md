## Objetivo
- Trocar o login atual (Magic Link/OTP) por **email + senha**.
- Permitir acesso **somente** para o email `admgestalt@gmail.com` com a senha cadastrada.
- Encurtar o texto do parágrafo (`p`) na tela de login.

## Decisão técnica (segurança e compatibilidade)
- Manter **Supabase Auth** para sessão e RLS (necessário para o dashboard e tabelas com `auth.uid()`), porém **usando apenas senha** (`signInWithPassword`) e **sem Magic Link**.
- A senha continua armazenada de forma segura (hash) no banco do Supabase Auth; nada de senha hardcoded no frontend.

## Mudanças no código
1. **Atualizar o hook de auth**
   - Em [useAuth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/hooks/useAuth.tsx):
     - Remover `signInWithEmailLink`.
     - Adicionar `signInWithPassword(email, password)` usando `supabase.auth.signInWithPassword`.

2. **Atualizar a página de login**
   - Em [Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx):
     - Reintroduzir campo `password` e validação Zod (`email` + `password`).
     - Remover estado/UX de “link enviado”.
     - Antes de chamar o Supabase, bloquear qualquer email diferente de `admgestalt@gmail.com`.
     - Botão volta a “Entrar”.

3. **Encurtar o texto do `p`**
   - Trocar o conteúdo atual por uma versão mais concisa, mantendo a intenção (ex.: “Gerencie seus templates do WhatsApp.”).

## Ajustes fora do código (Supabase Dashboard)
- Garantir que exista um usuário no Supabase Auth com email `admgestalt@gmail.com` e uma senha forte.
- Desativar signup público.
- Opcional: desativar provedores de OTP/Magic Link no painel, se não quiser que apareçam como opção.

## Validação
- Rodar `npm test` e `npm run build`.
- Teste manual:
  - Login com `admgestalt@gmail.com` + senha correta acessa o dashboard.
  - Outro email é bloqueado imediatamente no frontend.
  - Senha incorreta mostra erro de credenciais.
  - Texto do `p` aparece mais curto e legível.