

# Plano: Usar Modelo Gratuito e Melhorar Prompt da Edge Function

## Resumo

Vou atualizar a Edge Function `generate-whatsapp-template` para:
1. Usar o modelo **`openai/gpt-oss-120b:free`** do OpenRouter (gratuito)
2. Melhorar significativamente o prompt para gerar templates de **UTILITY** (utilitários) seguindo as diretrizes oficiais do WhatsApp Business

## O que será alterado

### Arquivo: `supabase/functions/generate-whatsapp-template/index.ts`

#### 1. Trocar o modelo
```
De: "openai/gpt-4o-mini"
Para: "openai/gpt-oss-120b:free"
```

#### 2. Melhorar o Prompt do Sistema

O prompt será reescrito para seguir as diretrizes oficiais do WhatsApp Business para templates de categoria UTILITY:

**Regras principais de Utility Templates (conforme documentacao Meta/WhatsApp):**
- Templates de UTILITY sao para acompanhamento de acoes ou solicitacoes do usuario
- Devem referenciar uma conta, transacao ou atividade especifica (ex: ID do pedido, numero de reserva)
- NAO podem conter conteudo promocional ou de marketing
- Exemplos validos: confirmacoes de pedido, atualizacoes de envio, recibos de pagamento, lembretes de compromisso, alertas de servico

**Novo prompt ira incluir:**
- Documentacao clara sobre o que e e o que NAO e um template UTILITY
- Exemplos reais de templates aprovados pelo WhatsApp
- Instrucoes para evitar linguagem de marketing (palavras como "oferta", "promocao", "desconto", "imperdivel")
- Diretrizes sobre uso correto de placeholders (`{{1}}`, `{{nome}}`, etc.)
- Estrutura clara de componentes: header, body, footer, buttons
- Limites de caracteres (body: 1024, footer: 60, button text: 25)
- Tom profissional, direto e transacional

#### 3. Melhorar Exemplos de Inspiracao

Adicionar exemplos reais de templates UTILITY aprovados:

```
Confirmacao de Pedido:
Ola {{nome}}! Seu pedido #{{numero_pedido}} foi confirmado.
Previsao de entrega: {{data_entrega}}.
Acompanhe pelo link abaixo.
[Botao: Acompanhar Pedido]

Lembrete de Pagamento:
{{nome}}, sua fatura no valor de R$ {{valor}} vence em {{data_vencimento}}.
Evite juros efetuando o pagamento ate a data.
[Botao: Ver Boleto] [Botao: Ja Paguei]

Atualizacao de Servico:
Ola {{nome}}! Seu atendimento #{{protocolo}} foi atualizado.
Status atual: {{status}}.
Previsao de conclusao: {{prazo}}.
[Botao: Ver Detalhes]
```

## Detalhes Tecnicos

### Alteracoes no codigo

**Linha 300 (modelo):**
```typescript
// De:
model: "openai/gpt-4o-mini",

// Para:
model: "openai/gpt-oss-120b:free",
```

**Linhas 202-278 (prompts):**
O `utilityDocSummary`, `inspirationExamples` e `systemPrompt` serao reescritos com:

1. **Documentacao oficial do WhatsApp** sobre templates UTILITY
2. **Regras de categorizacao** para evitar reclassificacao automatica como marketing
3. **Exemplos aprovados** de diferentes tipos (cobranca, confirmacao, alerta)
4. **Instrucoes claras** sobre tom, estrutura e limites
5. **Lista de palavras a evitar** (promocao, oferta, desconto, imperdivel, etc.)

### Resultado esperado

Apos a implementacao:
- A funcao usara um modelo gratuito do OpenRouter
- Os templates gerados serao genuinamente UTILITARIOS
- Maior chance de aprovacao pelo WhatsApp/Meta
- Templates com tom profissional e transacional

