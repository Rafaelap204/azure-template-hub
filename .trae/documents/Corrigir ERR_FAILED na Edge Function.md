## Diagnóstico (provável causa)
- Esse `net::ERR_FAILED` ao chamar `/functions/v1/generate-whatsapp-template` costuma acontecer quando o navegador bloqueia a resposta por **CORS/preflight**.
- Em Supabase Edge Functions, isso acontece frequentemente quando o **Verify JWT** está ativado no nível da função: o browser faz um `OPTIONS` (preflight) **sem Authorization**, o gateway responde `401/403` antes do seu código rodar, e a resposta vem sem CORS → o fetch vira `ERR_FAILED`.

## Correção (sem mudar seu fluxo de segurança)
- Manter a validação de segurança **dentro do código** (já existe: checa sessão e restringe ao email admin).
- Desabilitar a verificação automática do Supabase **apenas para essa função**, para permitir o `OPTIONS` passar:
  - **No Supabase Dashboard**: Edge Functions → `generate-whatsapp-template` → Settings → desligar *Verify JWT*.
  - **No repositório**: atualizar `supabase/config.toml` para:
    - `[functions.generate-whatsapp-template]`
    - `verify_jwt = false`

## Hardening de CORS (para evitar variações)
- Garantir que o `OPTIONS` responda `200` com os headers completos.
- (Opcional) adicionar `Access-Control-Max-Age` e incluir `x-requested-with` na lista de headers permitidos.

## Melhorar mensagem de erro no frontend
- Ajustar o tratamento do erro do `supabase.functions.invoke()` para diferenciar:
  - erro HTTP da função (mostra status/body)
  - erro de rede/CORS (mostra orientação específica: “verifique Verify JWT/CORS”).

## Verificação
- Validar no DevTools Network:
  - `OPTIONS` para a função deve retornar `200` com `Access-Control-Allow-Origin`.
  - `POST` deve retornar `200` (ou `4xx` com JSON e CORS, mas sem `ERR_FAILED`).
- Rodar `npm.cmd run lint` e `npx.cmd tsc -p tsconfig.app.json`.

Se você confirmar, eu aplico as mudanças no `supabase/config.toml` e ajusto o tratamento de erro no popup para você ver mensagens úteis em vez de `ERR_FAILED`.