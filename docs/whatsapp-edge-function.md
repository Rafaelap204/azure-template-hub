# WhatsApp Template Generator (Edge Function)

## Padrão de Nomenclatura (Edge Function)
- Nome recomendado (canônico): `generate-whatsapp-template`
- Formato: `kebab-case`

## Onde criar no projeto
- Pasta: `supabase/functions/<function-name>/index.ts`
- Exemplo: `supabase/functions/generate-whatsapp-template/index.ts`

## Como registrar/configurar (repositório)
- Arquivo: `supabase/config.toml`
- Exemplo:

```toml
[functions.generate-whatsapp-template]
verify_jwt = false
```

## Descoberta automática no frontend
O frontend usa a função `generate_template_whatsapp` para localizar e invocar automaticamente a Edge Function.

### Variáveis de ambiente (frontend)
- `VITE_SUPABASE_URL` (obrigatória em produção/staging)
- `VITE_SUPABASE_ANON_KEY` (obrigatória)
- `VITE_WHATSAPP_TEMPLATE_FUNCTION` (opcional): nome único da Edge Function
- `VITE_WHATSAPP_TEMPLATE_FUNCTION_CANDIDATES` (opcional): lista separada por vírgulas com nomes alternativos

Se nenhuma variável for definida, o fallback de descoberta tenta nesta ordem:
1. `generate-whatsapp-template`
2. `whatsapp-template-function`
3. `edge-whatsapp-sender`

### Healthcheck esperado
Para descoberta confiável, a Edge Function deve responder:
- `GET /functions/v1/<function-name>?health=1` → `200` com JSON `{ ok: true, name: "<function-name>" }`

## Exemplos de uso (frontend)

### 1) Texto simples com variáveis
```ts
import { generate_template_whatsapp } from '@/services/generateTemplateWhatsapp';

const result = await generate_template_whatsapp({
  kind: 'text_simple',
  title: 'Confirmação de pedido',
  message_type: 'cobranca',
  body: 'Olá {{nome}}! Seu pedido #{{pedido}} foi confirmado.',
  language: 'pt_BR',
  variables: { nome: 'Felipe', pedido: '1234' },
});
```

### 2) Mensagem com mídia (header)
```ts
import { generate_template_whatsapp } from '@/services/generateTemplateWhatsapp';

const result = await generate_template_whatsapp({
  kind: 'media',
  title: 'Aviso com imagem',
  message_type: 'vendas',
  header_format: 'IMAGE',
  media_url: 'https://exemplo.com/imagem.png',
  body: 'Olá {{nome}}! Confira o material.',
  language: 'pt_BR',
  variables: { nome: 'Maria' },
});
```

### 3) Template aprovado pela Meta (referência)
```ts
import { generate_template_whatsapp } from '@/services/generateTemplateWhatsapp';

const result = await generate_template_whatsapp({
  kind: 'meta_approved',
  template_name: 'payment_reminder_v1',
  language: 'pt_BR',
  components: [
    { type: 'BODY', text: 'Olá {{nome}}! Sua fatura vence em {{data}}.' },
  ],
  variables: { nome: 'João', data: '30/01/2026' },
});
```

## Execução por ambiente
- Desenvolvimento: chama `/functions/v1/...` (rota relativa) para passar pelo proxy do Vite.
- Staging/Produção: chama `${VITE_SUPABASE_URL}/functions/v1/...`.

## Testes
- Rodar testes: `npm test`
- Arquivo principal de testes: `src/services/generateTemplateWhatsapp.test.ts`

