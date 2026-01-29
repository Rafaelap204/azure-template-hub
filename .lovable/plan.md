

# Plano: Corrigir Edge Function para usar OpenRouter

## Resumo do Problema

A Edge Function `generate-whatsapp-template` foi alterada anteriormente para usar o **Lovable AI Gateway** (`google/gemini-2.5-flash` + `LOVABLE_API_KEY`). Você quer que ela use o **OpenRouter** com a chave `OPENROUTER_API_KEY` que você já configurou.

## O que será alterado

### Arquivo: `supabase/functions/generate-whatsapp-template/index.ts`

A Edge Function será revertida para usar o OpenRouter:

1. **Trocar a URL da API de IA**
   - De: `https://ai.gateway.lovable.dev/v1/chat/completions`
   - Para: `https://openrouter.ai/api/v1/chat/completions`

2. **Trocar a chave de API**
   - De: `LOVABLE_API_KEY`
   - Para: `OPENROUTER_API_KEY`

3. **Ajustar o modelo usado**
   - Usar um modelo compatível com OpenRouter (ex: `openai/gpt-4o-mini` ou `google/gemini-2.5-flash`)
   - O OpenRouter suporta vários modelos, incluindo os mesmos do Lovable AI Gateway

4. **Adicionar headers obrigatórios do OpenRouter**
   - O OpenRouter requer headers adicionais como `HTTP-Referer` e `X-Title` para identificar a aplicação

## Detalhes Tecnnicos

A Edge Function continuará funcionando da mesma forma:
- Health check via `GET ?health=1`
- Autenticação via JWT do Supabase
- Validação e sanitização do output da IA
- Mesma estrutura de resposta `GeneratedTemplate`

A única diferenca será o provedor de IA (OpenRouter ao invés de Lovable AI).

### Secrets Necessários

O secret `OPENROUTER_API_KEY` já está configurado no projeto, então não será necessário adicionar nenhum novo secret.

## Resultado Esperado

Após a implementação:
1. A Edge Function usará o OpenRouter para gerar templates
2. A integração com o seu Supabase permanece inalterada
3. O frontend continuará funcionando normalmente sem alterações

