import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

type GeneratorMessageType = "cobranca" | "vendas";

type GeneratedButton =
  | { type: "quick_reply"; text: string }
  | { type: "url"; text: string; url: string }
  | { type: "phone_number"; text: string; phone_number: string }
  | { type: "copy_code"; text: string }
  | { type: "call_request"; text: string };

type GeneratedTemplate = {
  whatsapp_template_name: string;
  broadcast_name_suggestion: string;
  category: "utility";
  message_type: GeneratorMessageType;
  language: string;
  header: { format: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION"; text?: string };
  body: { text: string };
  footer: { text?: string };
  buttons: GeneratedButton[];
  notes?: string[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugifyUnderscore = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 512);

const coerceString = (value: unknown) => (typeof value === "string" ? value : "");

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const pickJsonFromText = (text: string) => {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
};

const validateAndFix = (input: Partial<GeneratedTemplate>, fallbackTitle: string, messageType: GeneratorMessageType) => {
  const titleSlug = slugifyUnderscore(fallbackTitle) || "template_utilitario";
  const category = "utility" as const;
  const language = coerceString(input.language) || "pt_BR";
  const whatsapp_template_name = slugifyUnderscore(coerceString(input.whatsapp_template_name)) || titleSlug;
  const broadcast_name_suggestion = coerceString(input.broadcast_name_suggestion) || fallbackTitle.trim() || "Disparo utilitário";

  const headerFormatRaw = (input.header?.format ?? "NONE") as string;
  const headerFormatAllowed = new Set(["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"]);
  const headerFormat = (headerFormatAllowed.has(headerFormatRaw) ? headerFormatRaw : "NONE") as GeneratedTemplate["header"]["format"];
  const headerText = coerceString(input.header?.text).trim();

  const bodyText = coerceString(input.body?.text).trim();
  const body = { text: bodyText.slice(0, 1024) };

  const footerText = coerceString(input.footer?.text).trim();
  const footer = { text: footerText ? footerText.slice(0, 60) : undefined };

  const rawButtons = Array.isArray(input.buttons) ? input.buttons : [];
  const buttons: GeneratedButton[] = rawButtons
    .slice(0, 10)
    .map((b) => {
      const rec = asRecord(b);
      const type = coerceString(rec?.type).trim();
      const text = coerceString(rec?.text).trim().slice(0, 25);
      if (!text) return null;

      if (type === "url") {
        const url = coerceString(rec?.url).trim();
        if (!url) return { type: "quick_reply", text };
        return { type: "url", text, url };
      }
      if (type === "phone_number") {
        const phone_number = coerceString(rec?.phone_number).trim();
        if (!phone_number) return { type: "quick_reply", text };
        return { type: "phone_number", text, phone_number };
      }
      if (type === "copy_code") return { type: "copy_code", text };
      if (type === "call_request") return { type: "call_request", text };
      return { type: "quick_reply", text };
    })
    .filter(Boolean) as GeneratedButton[];

  const header =
    headerFormat === "TEXT" && headerText
      ? { format: "TEXT" as const, text: headerText.slice(0, 60) }
      : { format: "NONE" as const };

  if (!body.text) {
    throw new Error("Resposta inválida: body.text vazio.");
  }

  return {
    whatsapp_template_name,
    broadcast_name_suggestion,
    category,
    message_type: messageType,
    language,
    header,
    body,
    footer,
    buttons,
    notes: Array.isArray(input.notes) ? input.notes.map(coerceString).filter(Boolean) : undefined,
  } satisfies GeneratedTemplate;
};

serve(async (req) => {
  console.log("[generate-whatsapp-template] Request received:", req.method, req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("health") === "1") {
      console.log("[generate-whatsapp-template] Health check OK");
      return jsonResponse(200, { ok: true, name: "generate-whatsapp-template" });
    }
    return jsonResponse(200, { ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

    console.log("[generate-whatsapp-template] Checking env vars...");
    console.log("[generate-whatsapp-template] SUPABASE_URL:", SUPABASE_URL ? "set" : "missing");
    console.log("[generate-whatsapp-template] SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "set" : "missing");
    console.log("[generate-whatsapp-template] OPENROUTER_API_KEY:", OPENROUTER_API_KEY ? "set" : "missing");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return jsonResponse(500, { error: "Supabase env vars ausentes." });
    }

    if (!OPENROUTER_API_KEY) {
      return jsonResponse(500, { error: "Secret OPENROUTER_API_KEY não configurada." });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) {
      console.log("[generate-whatsapp-template] No authorization header");
      return jsonResponse(401, { error: "Authorization ausente." });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.email) {
      console.log("[generate-whatsapp-template] User auth failed:", userError?.message);
      return jsonResponse(401, { error: "Sessão inválida." });
    }

    console.log("[generate-whatsapp-template] User authenticated:", userData.user.email);

    const payload = await req.json().catch(() => null) as
      | {
          title?: string;
          category?: string;
          message_type?: GeneratorMessageType;
          prompt?: string;
          language?: string;
        }
      | null;

    const title = coerceString(payload?.title).trim();
    const prompt = coerceString(payload?.prompt).trim();
    const messageType = (payload?.message_type === "vendas" ? "vendas" : "cobranca") as GeneratorMessageType;
    const language = coerceString(payload?.language).trim() || "pt_BR";

    if (!title) return jsonResponse(400, { error: "Campo title é obrigatório." });
    if (!prompt) return jsonResponse(400, { error: "Campo prompt é obrigatório." });

    console.log("[generate-whatsapp-template] Generating template for:", title);

    const utilityDocSummary = `
## DIRETRIZES OFICIAIS - WhatsApp Business UTILITY Templates

### O que é um template UTILITY (Utilitário)?
Templates de UTILITY são mensagens transacionais que respondem a uma AÇÃO ou SOLICITAÇÃO específica do usuário. Eles fornecem informações sobre uma transação em andamento, conta ou atividade do cliente.

### Exemplos VÁLIDOS de UTILITY:
- Confirmações de pedido/reserva/agendamento
- Atualizações de status de entrega/envio
- Recibos e confirmações de pagamento
- Lembretes de compromissos/vencimentos
- Alertas de conta (senha, segurança, atividade)
- Atualizações de atendimento/suporte

### O que NÃO é UTILITY (será reclassificado como MARKETING):
- Promoções, ofertas ou descontos
- Convites para eventos sem solicitação prévia
- Recomendações de produtos
- Conteúdo com linguagem persuasiva/vendas
- Newsletters ou atualizações gerais

### Palavras PROIBIDAS em UTILITY (evitar absolutamente):
oferta, promoção, desconto, imperdível, exclusivo, aproveite, não perca, grátis, brinde, especial, limitado, última chance, oportunidade, confira, novidade, lançamento

### Regras de Estrutura:
- HEADER: opcional, máx 60 chars (TEXT) ou mídia (IMAGE/VIDEO/DOCUMENT)
- BODY: obrigatório, máx 1024 chars, tom direto e informativo
- FOOTER: opcional, máx 60 chars (ex: identificação da empresa)
- BUTTONS: máx 10, cada texto máx 25 chars

### Placeholders:
Use {{nome_variavel}} em lowercase com underscores. Ex: {{nome}}, {{numero_pedido}}, {{data_vencimento}}, {{valor}}, {{status}}
`.trim();

    const inspirationExamples = `
## EXEMPLOS APROVADOS DE TEMPLATES UTILITY

### 1. Confirmação de Pedido
Header: Pedido Confirmado ✓
Body:
Olá {{nome}}!

Seu pedido #{{numero_pedido}} foi confirmado com sucesso.

📦 Itens: {{quantidade}} produto(s)
💰 Total: R$ {{valor_total}}
📅 Previsão de entrega: {{data_entrega}}

Acompanhe o status pelo botão abaixo.
Footer: {{nome_empresa}}
Buttons: [Acompanhar Pedido] [Falar com Suporte]

### 2. Lembrete de Pagamento
Header: Lembrete de Vencimento
Body:
{{nome}}, sua fatura está próxima do vencimento.

📄 Fatura: #{{numero_fatura}}
💵 Valor: R$ {{valor}}
📅 Vencimento: {{data_vencimento}}

Efetue o pagamento até a data para evitar encargos.
Footer: Central de Atendimento
Buttons: [Ver Boleto] [Já Paguei] [Preciso de Ajuda]

### 3. Atualização de Entrega
Header: Atualização do Pedido
Body:
Olá {{nome}}!

Seu pedido #{{numero_pedido}} está em trânsito.

🚚 Status: {{status_entrega}}
📍 Última localização: {{localizacao}}
📅 Previsão: {{data_prevista}}

Rastreie em tempo real pelo link abaixo.
Footer: Logística {{empresa}}
Buttons: [Rastrear Pedido]

### 4. Confirmação de Agendamento
Header: Agendamento Confirmado
Body:
{{nome}}, seu agendamento foi confirmado!

📅 Data: {{data}}
⏰ Horário: {{horario}}
📍 Local: {{endereco}}
👨‍⚕️ Profissional: {{nome_profissional}}

Caso precise reagendar, entre em contato.
Footer: {{nome_empresa}}
Buttons: [Confirmar Presença] [Reagendar]

### 5. Alerta de Segurança
Header: Alerta de Segurança
Body:
{{nome}}, detectamos uma atividade em sua conta.

🔐 Tipo: {{tipo_atividade}}
📅 Data/Hora: {{data_hora}}
📍 Dispositivo: {{dispositivo}}

Se não foi você, proteja sua conta imediatamente.
Footer: Equipe de Segurança
Buttons: [Fui Eu] [Proteger Conta]
`.trim();

    const systemPrompt = `
Você é um especialista em criar templates de WhatsApp Business da categoria UTILITY (Utilitários). Sua tarefa é gerar templates que serão APROVADOS pelo WhatsApp/Meta.

${utilityDocSummary}

${inspirationExamples}

## INSTRUÇÕES DE GERAÇÃO

Você DEVE retornar APENAS um JSON válido (sem markdown, sem explicações, sem texto antes ou depois).

### Schema obrigatório do JSON:
{
  "whatsapp_template_name": "string (slug em lowercase_underscore, máx 512 chars)",
  "broadcast_name_suggestion": "string (nome amigável para o disparo)",
  "category": "utility",
  "message_type": "cobranca|vendas",
  "language": "pt_BR",
  "header": { 
    "format": "NONE|TEXT|IMAGE|VIDEO|DOCUMENT|LOCATION", 
    "text": "string (só se format=TEXT, máx 60 chars)" 
  },
  "body": { "text": "string (obrigatório, máx 1024 chars)" },
  "footer": { "text": "string (opcional, máx 60 chars)" },
  "buttons": [
    { "type": "quick_reply", "text": "string (máx 25 chars)" },
    { "type": "url", "text": "string", "url": "https://..." },
    { "type": "phone_number", "text": "string", "phone_number": "+55..." },
    { "type": "copy_code", "text": "string" },
    { "type": "call_request", "text": "string" }
  ],
  "notes": ["observações opcionais"]
}

### Regras CRÍTICAS:
1. O template DEVE ser genuinamente UTILITÁRIO - resposta a uma ação/transação do usuário
2. NUNCA use palavras de marketing: oferta, promoção, desconto, imperdível, exclusivo, aproveite, grátis
3. Tom: profissional, direto, informativo, sem exageros ou urgência artificial
4. Inclua placeholders relevantes: {{nome}}, {{numero_pedido}}, {{data}}, {{valor}}, etc.
5. Body deve ter informações estruturadas com emojis informativos (📦📅💰) quando apropriado
6. Botões devem ser ações práticas relacionadas à transação (Acompanhar, Ver, Confirmar)
7. Se message_type="cobranca": foco em faturas, pagamentos, vencimentos
8. Se message_type="vendas": foco em pedidos, entregas, status de compras

### Processo interno (não incluir na resposta):
1. Analisar o objetivo do usuário
2. Identificar qual tipo de transação/ação está sendo comunicada
3. Estruturar header informativo (se aplicável)
4. Escrever body com dados da transação de forma clara
5. Adicionar footer com identificação (opcional)
6. Criar botões de ação relevantes
7. Gerar nome do template como slug e nome amigável
`.trim();

    const userPrompt = `
Dados do pedido:
- title: ${title}
- category: utility (fixo)
- message_type: ${messageType}
- language: ${language}
- prompt do usuário: ${prompt}
`.trim();

    console.log("[generate-whatsapp-template] Calling OpenRouter AI...");

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agentectu.lovable.app",
        "X-Title": "AgenteCTU WhatsApp Template Generator",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        temperature: 0.6,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.log("[generate-whatsapp-template] OpenRouter error:", aiResponse.status, errText);
      return jsonResponse(502, { error: "Falha ao chamar OpenRouter AI.", details: errText.slice(0, 1500) });
    }

    type AIChatCompletion = {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const aiUnknown: unknown = await aiResponse.json();
    const aiJson = asRecord(aiUnknown) as AIChatCompletion | null;
    const content = coerceString(aiJson?.choices?.[0]?.message?.content);

    console.log("[generate-whatsapp-template] AI response content length:", content.length);

    if (!content) {
      return jsonResponse(502, { error: "OpenRouter AI retornou resposta vazia." });
    }

    const rawJson = pickJsonFromText(content);
    const parsed = JSON.parse(rawJson) as Partial<GeneratedTemplate>;
    const fixed = validateAndFix(parsed, title, messageType);

    console.log("[generate-whatsapp-template] Template generated successfully:", fixed.whatsapp_template_name);

    return jsonResponse(200, fixed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.log("[generate-whatsapp-template] Error:", message);
    return jsonResponse(500, { error: message });
  }
});
