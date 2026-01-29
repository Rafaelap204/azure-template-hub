## Causa Raiz (Estado Atual)
- O erro `Requested function was not found` indica que o endpoint remoto recebeu a requisição, mas **não existe nenhuma Edge Function publicada** com o nome chamado no projeto Supabase.
- No frontend, a chamada segue o padrão `/functions/v1/<nome>` (proxy em dev via [vite.config.ts](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/vite.config.ts)) e a função atualmente esperada é `generate-whatsapp-template` (kebab-case) conforme [whatsappTemplateService.ts](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/services/whatsappTemplateService.ts).

## Objetivo do Pedido
- Criar uma função **`generate_template_whatsapp`** (frontend/SDK) que:
  - Monte templates dinâmicos com variáveis.
  - Valide parâmetros obrigatórios.
  - Faça chamada robusta com retry/backoff.
  - **Descubra automaticamente** qual Edge Function correta chamar (por padrão de nomenclatura/config).
  - Funcione em dev/staging/prod.
  - Tenha testes unitários cobrindo sucesso/falha.
  - Documente padrão de nomes, configuração e exemplos.

## Implementação (Código)
1. **Criar serviço novo (fonte única de verdade)**
   - Criar `src/services/generateTemplateWhatsapp.ts` exportando:
     - `generate_template_whatsapp(input, options?)`
     - `discoverEdgeFunctionName(options?)`
     - helpers: `interpolateVariables(text, vars)`
   - Usar **Zod** (já presente no projeto) para validação de entrada/saída (ex.: [Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx)).

2. **Descoberta automática da Edge Function**
   - Padrão de descoberta em ordem:
     1) `VITE_WHATSAPP_TEMPLATE_FUNCTION` (nome único, se definido)
     2) `VITE_WHATSAPP_TEMPLATE_FUNCTION_CANDIDATES` (lista `,` separada)
     3) fallback interno por convenção (ex.: `generate-whatsapp-template`, `whatsapp-template-function`, `edge-whatsapp-sender`)
   - Estratégia de descoberta (sem depender de APIs administrativas):
     - Para cada candidato, fazer uma chamada leve e determinística:
       - `GET /functions/v1/<nome>?health=1`.
     - Considerar “existe” quando status != 404.
   - **Para isso ser confiável**, atualizar a Edge Function geradora para responder `GET` com `{ ok: true, name: "..." }` (healthcheck), sem exigir auth.

3. **Integração com Edge Function (invocação real)**
   - `generate_template_whatsapp` irá:
     - Resolver base URL por ambiente:
       - DEV: `/functions/v1` (proxy do Vite)
       - STAGING/PROD: `${VITE_SUPABASE_URL}/functions/v1`
     - Descobrir `functionName` uma vez (cache em memória) e invocar `POST .../<functionName>`.
     - Reaproveitar retry/backoff exponencial para erros de rede/5xx/429.
     - Normalizar erros para um formato padrão `{ code, message, details }`.

4. **Templates dinâmicos e suporte a variáveis**
   - Definir um modelo de entrada com `templateType`:
     - `text_simple`: body string com `{{variavel}}`
     - `media`: header com `format` e URL/descritor + body com variáveis
     - `meta_approved`: nome do template aprovado + language + componentes + variáveis
   - `interpolateVariables` substituirá `{{var}}` com valores e poderá validar variáveis ausentes (opção `strict`).

5. **Refatoração mínima do uso atual**
   - Atualizar [TemplateSelectionDialog.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/TemplateSelectionDialog.tsx) para chamar `generate_template_whatsapp`.
   - Manter compatibilidade (opcional): `generateWhatsappTemplate` pode virar wrapper para a nova função.

## Padrão de Nomenclatura e Registro (Documentação)
- Nome esperado de Edge Function: **kebab-case**.
- Estrutura no repo:
  - `supabase/functions/<function-name>/index.ts`
- Registro/configuração:
  - `supabase/config.toml` em `[functions.<function-name>]` (ex.: [config.toml](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/supabase/config.toml)).
- Variáveis de ambiente (frontend):
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - `VITE_WHATSAPP_TEMPLATE_FUNCTION`
  - `VITE_WHATSAPP_TEMPLATE_FUNCTION_CANDIDATES`
- Vou adicionar um `docs/whatsapp-edge-function.md` com:
  - Padrão de nomes
  - Onde criar
  - Como registrar
  - Exemplos de uso para `text_simple`, `media`, `meta_approved`

## Testes (Vitest)
- Criar testes em `src/services/generateTemplateWhatsapp.test.ts`:
  - Descoberta: 404 no primeiro candidato e sucesso no segundo.
  - Ambientes: DEV usa rota relativa; PROD usa URL completa.
  - Interpolação: substituição, variável ausente (strict), caracteres especiais.
  - Tratamento de erros: rede (throw), 5xx com retry, 404 “não encontrado”.
- Mock de `fetch` via `vi.stubGlobal('fetch', ...)`.

## Verificação / Cenários
- DEV:
  - Confirmar proxy `/functions/v1` ativo.
  - Verificar healthcheck `GET /functions/v1/<nome>?health=1`.
- STAGING/PROD:
  - Verificar `GET https://<ref>.supabase.co/functions/v1/<nome>?health=1`.
  - Verificar `POST` real com payload válido.

Se você aprovar, eu implemento os arquivos/alterações acima, adiciono os testes e deixo documentado com exemplos prontos para copiar/colar.