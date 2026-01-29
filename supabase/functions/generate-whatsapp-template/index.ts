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
Regras essenciais de Utility Templates (WhatsApp Business):
- Finalidade: resposta a ação do usuário (confirmação/atualização/alerta operacional). Evitar marketing.
- Componentes: 1 header (opcional), 1 body (obrigatório), 1 footer (opcional), até 10 botões (opcional).
- Body: máximo 1024 caracteres. Footer: máximo 60 caracteres.
- Botões suportados: call_request, copy_code, phone_number, quick_reply, url.
- Conteúdo com marketing pode ser reclassificado automaticamente como "marketing".
`.trim();

    const inspirationExamples = `
Exemplos de estilo (inspire-se sem copiar):
1)
[Confirme seu Interesse]
Olá Felipe! Tenho uma atualização para você sobre seu acesso ao Treinamento capacitação profissional – Setor Imobiliário
Está disponível a Mentoria Imobiliária – Reforma Tributária Sem Complicar, com abordagem prática sobre a aplicação do novo modelo tributário (CBS e IBS) nas operações com bens imóveis.
📅 30/01/2026 (sexta-feira)
⏰ 13h30 às 17h30
📍 Modalidade híbrida – Presencial em Belo Horizonte/MG + on-line ao vivo
👩‍🏫 Instrutora: Professora Andréa Lacerda
Botão: Quero Confirmar

2)
[Confirmação de Pedido]
Olá {{nome}}! Seu pedido #{{pedido}} foi confirmado.
Previsão de entrega: {{data}}.
Botões: Acompanhar pedido | Falar com suporte

3)
[Aviso de Pagamento]
Olá {{nome}}! Identificamos que sua fatura vence em {{data_vencimento}} no valor de {{valor}}.
Botões: Ver boleto | Preciso de ajuda
`.trim();

    const systemPrompt = `
Você é um especialista em WhatsApp Business Templates, focado em UTILITY templates. Sua tarefa é gerar um template utilitário completo e compatível.

${utilityDocSummary}

Saída OBRIGATÓRIA: responda somente com JSON válido (sem markdown, sem texto extra).
O JSON DEVE obedecer exatamente este shape:
{
  "whatsapp_template_name": "string_slug_lowercase_underscore",
  "broadcast_name_suggestion": "string",
  "category": "utility",
  "message_type": "cobranca|vendas",
  "language": "pt_BR",
  "header": { "format": "NONE|TEXT|IMAGE|VIDEO|DOCUMENT|LOCATION", "text": "string_opcional_quando_TEXT" },
  "body": { "text": "string" },
  "footer": { "text": "string_opcional" },
  "buttons": [
    { "type": "quick_reply", "text": "string" },
    { "type": "url", "text": "string", "url": "https://..." },
    { "type": "phone_number", "text": "string", "phone_number": "+55..." },
    { "type": "copy_code", "text": "string" },
    { "type": "call_request", "text": "string" }
  ],
  "notes": ["string_opcional"]
}

Restrições:
- body.text é obrigatório e deve ter no máximo 1024 caracteres.
- footer.text, se existir, deve ter no máximo 60 caracteres.
- header.text só pode existir se header.format = "TEXT" e deve ser curto (máx. 60).
- buttons: no máximo 10 itens; cada button.text deve ter no máximo 25 caracteres.
- O conteúdo deve ser UTILITÁRIO (transacional/operacional). Evite linguagem de marketing, promessa, exagero, urgência artificial, promoção.
- Use placeholders no formato {{param_nome}} quando fizer sentido, com nomes em lowercase e underscores.

Passo a passo de construção (faça internamente, mas só retorne o JSON):
1) Interpretar o objetivo e contexto do usuário e o tipo (cobranca ou vendas).
2) Definir se haverá header (TEXT) com uma frase curta e objetiva, ou NONE.
3) Escrever body com informações essenciais, clareza, tom profissional e direto, com quebras de linha.
4) (Opcional) footer com instrução curta ou identificação.
5) Definir botões úteis (quick_reply/url/phone_number/copy_code/call_request) alinhados ao objetivo, sem exceder limites.
6) Gerar whatsapp_template_name como slug em lowercase_underscore e broadcast_name_suggestion como nome amigável.

${inspirationExamples}
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
        model: "openai/gpt-4o-mini",
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
