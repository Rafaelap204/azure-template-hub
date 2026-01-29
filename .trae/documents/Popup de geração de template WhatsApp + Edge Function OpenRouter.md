## Objetivo
- Ao clicar em “Criar Template” no Dashboard, abrir o popup existente e transformá-lo em um gerador de template WhatsApp (categoria sempre utilitário), com envio para uma Edge Function do Supabase que chama a API do OpenRouter (GPT Nano) e retorna um template estruturado + preview.

## Pesquisa rápida (estado atual)
- O popup existente é [TemplateSelectionDialog.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/TemplateSelectionDialog.tsx) e hoje serve para selecionar um template base.
- O botão “Criar Template” no Dashboard hoje navega para `/templates/new` (página [TemplateCreate.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/TemplateCreate.tsx)).
- Não há pasta de Edge Functions no repo ainda (`supabase/functions` não existe).

## Alterações de UI (popup)
1. Reaproveitar o popup existente (TemplateSelectionDialog) e evoluir para suportar 2 modos:
   - **mode = "select"**: mantém o comportamento atual (buscar e selecionar template base).
   - **mode = "generate"**: novo formulário de geração.
2. No modo **generate**, o popup terá:
   - Campo **Título do template**.
   - Campo **Categoria** (fixo “Utilitário”, travado/readonly).
   - Campo **Tipo de mensagem**: `cobranca` ou `vendas`.
   - Campo **Prompt** (textarea) para orientar cabeçalho/corpo/rodapé/botões.
   - Botão **Gerar template**.
3. Após gerar, o próprio popup muda para um “resultado” com 2 colunas:
   - **Esquerda**: “preview de celular” simulando WhatsApp (header, body, footer e botões).
   - **Direita**: blocos prontos para copiar (Header/Body/Footer/Buttons) + **sugestão de nome para disparo** + botão **Salvar no Supabase**.

## Mudanças no Dashboard
- Atualizar [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx) para:
  - Clicar em **Criar Template** abrir o popup em `mode="generate"`.
  - Manter **Usar Existente** abrindo o mesmo popup em `mode="select"`.

## Integração com Supabase Edge Function
1. Criar a Edge Function `generate-whatsapp-template` em `supabase/functions/generate-whatsapp-template/index.ts`.
2. A Edge Function irá:
   - Validar CORS.
   - Validar autenticação (JWT) e opcionalmente restringir ao email admin `admgestalt@gmail.com`.
   - Construir um **prompt ultra completo passo a passo** com base:
     - Regras de templates utilitários: header opcional, body obrigatório (até 1024 chars), footer opcional (até 60 chars), até 10 botões; tipos de botões suportados (URL, phone_number, quick_reply, copy_code, call_request); conteúdo utilitário e evitar marketing para não virar “marketing”.
     - Exemplos inspiracionais (incluindo o seu exemplo) “sem copiar”.
   - Chamar o OpenRouter `POST https://openrouter.ai/api/v1/chat/completions` com `OPENROUTER_API_KEY` (secret) e modelo configurável (default “gpt nano”).
   - Forçar resposta em **JSON estrito** com este formato:
     - `whatsapp_template_name` (slug recomendado, ex: `confirme_seu_interesse`)
     - `broadcast_name_suggestion` (nome sugerido para disparo)
     - `category` = `utility`
     - `message_type` = `cobranca|vendas`
     - `language` (default `pt_BR`)
     - `header`: `{ format: "TEXT"|"IMAGE"|"VIDEO"|"DOCUMENT"|"LOCATION"|"NONE", text?: string }`
     - `body`: `{ text: string }`
     - `footer`: `{ text?: string }`
     - `buttons`: `Array<{ type: "quick_reply"|"url"|"phone_number"|"copy_code"|"call_request", text: string, url?: string, phone_number?: string }>`
     - `notes` (opcional) com alertas de compliance.
   - Retornar isso para o frontend.

## Fluxo de “Salvar no Supabase”
- Do popup (modo resultado), ao clicar **Salvar**, inserir em `public.templates`:
  - `name`: usar o título informado (ou permitir trocar pelo sugerido antes de salvar).
  - `category`: sempre `utility`.
  - `content`: salvar em formato legível (ex: Header/Body/Footer/Buttons em texto) para continuar compatível com as telas atuais.
  - `user_id`: `user.id`.

## Dependências
- Não adicionar dependências: usar `fetch` nativo tanto no frontend quanto na Edge Function.

## Verificação
- Rodar `npm.cmd run lint` e `npx.cmd tsc -p tsconfig.app.json`.
- Validar manualmente:
  - Abrir Dashboard → “Criar Template” abre popup → preencher → gerar → ver preview → copiar → salvar → template aparece na lista.

## Configuração necessária (secrets)
- Definir no Supabase (Edge Functions secrets):
  - `OPENROUTER_API_KEY`
  - opcional `OPENROUTER_MODEL` (default usado se não setar)

Se você confirmar, eu implemento exatamente esse fluxo no código e deixo a Edge Function pronta para você colar no Supabase.