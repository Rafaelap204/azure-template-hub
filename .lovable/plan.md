
# Plano: Corrigir Conexão com Edge Function de Geração de Templates

## Resumo do Problema

A geração de templates WhatsApp está falhando porque:
1. A Edge Function `generate-whatsapp-template` não está deployada
2. O secret `OPENROUTER_API_KEY` não está configurado

## Passos para Correção

### Passo 1: Configurar o Secret OPENROUTER_API_KEY

A Edge Function depende da API do OpenRouter para gerar os templates usando IA. Você precisará:

1. Obter uma API key do OpenRouter (em https://openrouter.ai)
2. Adicionar o secret `OPENROUTER_API_KEY` no projeto

Usarei a ferramenta de adicionar secrets para solicitar que você insira a chave.

### Passo 2: Fazer Deploy da Edge Function

A função existe no código em `supabase/functions/generate-whatsapp-template/index.ts` mas precisa ser deployada. Farei o deploy da função automaticamente.

### Passo 3: Verificar Funcionamento

Após o deploy e configuração do secret:
- Testarei a Edge Function com uma chamada de health check
- Verificarei se a autenticação está funcionando corretamente
- Confirmarei que a geração de templates está operacional

## Detalhes Técnicos

A Edge Function atual já tem:
- CORS configurado corretamente
- Health check endpoint (`GET ?health=1`)
- Validação de autenticação via JWT
- Verificação de permissão por email
- Integração com OpenRouter para geração via IA
- Validação e sanitização do output

A configuração em `supabase/config.toml` com `verify_jwt = false` está correta para o padrão Lovable Cloud (validação manual no código).

## Observação Importante

A Edge Function atualmente só permite acesso para o email `admgestalt@gmail.com`. Se você precisar permitir outros usuários, será necessário ajustar a lógica de permissão na função.
