import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export type GeneratorMessageType = 'cobranca' | 'vendas';

export type TemplateKind = 'generator_prompt' | 'text_simple' | 'media' | 'meta_approved';

export const VariableMapSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({});
export type VariableMap = z.infer<typeof VariableMapSchema>;

const GeneratorPromptInputSchema = z.object({
  kind: z.literal('generator_prompt'),
  title: z.string().trim().min(1),
  message_type: z.enum(['cobranca', 'vendas']),
  prompt: z.string().trim().min(1),
  language: z.string().trim().min(1).default('pt_BR'),
  variables: VariableMapSchema.optional(),
});

const TextSimpleInputSchema = z.object({
  kind: z.literal('text_simple'),
  title: z.string().trim().min(1),
  message_type: z.enum(['cobranca', 'vendas']),
  body: z.string().trim().min(1),
  language: z.string().trim().min(1).default('pt_BR'),
  variables: VariableMapSchema.optional(),
});

const MediaInputSchema = z.object({
  kind: z.literal('media'),
  title: z.string().trim().min(1),
  message_type: z.enum(['cobranca', 'vendas']),
  header_format: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']),
  media_url: z.string().trim().url(),
  body: z.string().trim().min(1),
  language: z.string().trim().min(1).default('pt_BR'),
  variables: VariableMapSchema.optional(),
});

const MetaApprovedInputSchema = z.object({
  kind: z.literal('meta_approved'),
  template_name: z.string().trim().min(1),
  language: z.string().trim().min(1).default('pt_BR'),
  components: z.array(z.unknown()).default([]),
  variables: VariableMapSchema.optional(),
  title: z.string().trim().min(1).default('Template Meta'),
  message_type: z.enum(['cobranca', 'vendas']).default('cobranca'),
});

export const GenerateTemplateWhatsappInputSchema = z.discriminatedUnion('kind', [
  GeneratorPromptInputSchema,
  TextSimpleInputSchema,
  MediaInputSchema,
  MetaApprovedInputSchema,
]);

export type GenerateTemplateWhatsappInput = z.infer<typeof GenerateTemplateWhatsappInputSchema>;

export type GeneratedButton =
  | { type: 'quick_reply'; text: string }
  | { type: 'url'; text: string; url: string }
  | { type: 'phone_number'; text: string; phone_number: string }
  | { type: 'copy_code'; text: string }
  | { type: 'call_request'; text: string };

export const GeneratedTemplateSchema = z.object({
  whatsapp_template_name: z.string().min(1),
  broadcast_name_suggestion: z.string().min(1),
  category: z.literal('utility'),
  message_type: z.enum(['cobranca', 'vendas']),
  language: z.string().optional(),
  header: z.object({
    format: z.enum(['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION']),
    text: z.string().optional(),
  }),
  body: z.object({
    text: z.string().min(1),
  }),
  footer: z
    .object({
      text: z.string().optional(),
    })
    .optional(),
  buttons: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('quick_reply'), text: z.string().min(1) }),
        z.object({ type: z.literal('url'), text: z.string().min(1), url: z.string().min(1) }),
        z.object({ type: z.literal('phone_number'), text: z.string().min(1), phone_number: z.string().min(1) }),
        z.object({ type: z.literal('copy_code'), text: z.string().min(1) }),
        z.object({ type: z.literal('call_request'), text: z.string().min(1) }),
      ]),
    )
    .optional(),
  notes: z.array(z.string()).optional(),
});

export type GeneratedTemplate = z.infer<typeof GeneratedTemplateSchema>;

export type GenerateTemplateWhatsappOptions = {
  baseUrl?: string;
  candidates?: string[];
  functionName?: string;
  strictVariables?: boolean;
};

let cachedResolution:
  | {
      baseUrl: string;
      functionName: string;
    }
  | undefined;

export const resetEdgeFunctionDiscoveryCache = () => {
  cachedResolution = undefined;
};

export const interpolateVariables = (text: string, vars: VariableMap, strict = false) => {
  const normalized: Record<string, string> = {};
  Object.entries(vars ?? {}).forEach(([k, v]) => {
    normalized[k] = String(v);
  });

  const missing = new Set<string>();
  const result = text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name: string) => {
    if (Object.prototype.hasOwnProperty.call(normalized, name)) return normalized[name] ?? '';
    missing.add(name);
    return '';
  });

  if (strict && missing.size) {
    throw new Error(`Variáveis ausentes: ${Array.from(missing).join(', ')}`);
  }

  return result;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 500): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if ((response.status >= 500 && response.status < 600) || response.status === 429) {
      throw new Error(`Upstream error: ${response.status}`);
    }
    return response;
  } catch (err) {
    if (retries <= 0) throw err;
    await wait(backoff);
    return fetchWithRetry(url, options, retries - 1, Math.min(8000, backoff * 2));
  }
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getDefaultBaseUrl = () => {
  if (import.meta.env.DEV) return '/functions/v1';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) return `${trimTrailingSlash(supabaseUrl)}/functions/v1`;
  return '/functions/v1';
};

const parseCandidatesFromEnv = (): string[] => {
  const single = import.meta.env.VITE_WHATSAPP_TEMPLATE_FUNCTION;
  if (single && String(single).trim()) return [String(single).trim()];

  const list = import.meta.env.VITE_WHATSAPP_TEMPLATE_FUNCTION_CANDIDATES;
  if (list && String(list).trim()) {
    return String(list)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return ['generate-whatsapp-template', 'whatsapp-template-function', 'edge-whatsapp-sender'];
};

const asJson = async (response: Response): Promise<unknown | null> => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const discoverEdgeFunctionName = async (options?: GenerateTemplateWhatsappOptions): Promise<string> => {
  const baseUrl = trimTrailingSlash(options?.baseUrl ?? getDefaultBaseUrl());
  const candidates = (options?.candidates ?? parseCandidatesFromEnv()).filter(Boolean);

  if (options?.functionName) return options.functionName;

  if (cachedResolution && cachedResolution.baseUrl === baseUrl) return cachedResolution.functionName;

  const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  for (const candidate of candidates) {
    const healthUrl = `${baseUrl}/${candidate}?health=1`;
    let response: Response;
    try {
      response = await fetchWithRetry(healthUrl, {
        method: 'GET',
        headers: {
          ...(supabaseKey ? { apikey: supabaseKey } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    } catch {
      continue;
    }

    if (response.status === 404) {
      const json = await asJson(response);
      const code = typeof (json as any)?.code === 'string' ? (json as any).code : undefined;
      if (code === 'NOT_FOUND') continue;
      continue;
    }

    cachedResolution = { baseUrl, functionName: candidate };
    return candidate;
  }

  throw new Error(
    `Nenhuma Edge Function encontrada. Tentativas: ${candidates.join(', ')}. Faça deploy da função no Supabase.`,
  );
};

const buildPromptFromInput = (input: GenerateTemplateWhatsappInput, strictVariables: boolean) => {
  const vars = input.variables ?? {};

  if (input.kind === 'generator_prompt') {
    const renderedPrompt = interpolateVariables(input.prompt, vars, strictVariables);
    return { title: input.title, message_type: input.message_type, prompt: renderedPrompt, language: input.language };
  }

  if (input.kind === 'text_simple') {
    const body = interpolateVariables(input.body, vars, strictVariables);
    const prompt = [
      'Gere um template WhatsApp do tipo UTILITY.',
      `Título: ${input.title}`,
      `Tipo: ${input.message_type}`,
      `Idioma: ${input.language}`,
      'Base de mensagem (adicione melhorias mantendo utilitário):',
      body,
    ].join('\n');
    return { title: input.title, message_type: input.message_type, prompt, language: input.language };
  }

  if (input.kind === 'media') {
    const body = interpolateVariables(input.body, vars, strictVariables);
    const prompt = [
      'Gere um template WhatsApp do tipo UTILITY com mídia no HEADER.',
      `Título: ${input.title}`,
      `Tipo: ${input.message_type}`,
      `Idioma: ${input.language}`,
      `Header.format: ${input.header_format}`,
      `Header.media_url: ${input.media_url}`,
      'Body base:',
      body,
      'Inclua botões úteis se fizer sentido.',
    ].join('\n');
    return { title: input.title, message_type: input.message_type, prompt, language: input.language };
  }

  const renderedName = interpolateVariables(input.template_name, vars, strictVariables);
  const prompt = [
    'Crie um template compatível com Meta Approved Templates.',
    `Nome do template (referência): ${renderedName}`,
    `Idioma: ${input.language}`,
    `Componentes (JSON): ${JSON.stringify(input.components)}`,
    'Gere um template utilitário consistente com estes componentes e placeholders.',
  ].join('\n');
  return { title: input.title, message_type: input.message_type, prompt, language: input.language };
};

export const generate_template_whatsapp = async (
  rawInput: unknown,
  options?: GenerateTemplateWhatsappOptions,
): Promise<GeneratedTemplate> => {
  const input = GenerateTemplateWhatsappInputSchema.parse(rawInput);

  const baseUrl = trimTrailingSlash(options?.baseUrl ?? getDefaultBaseUrl());
  const functionName = await discoverEdgeFunctionName({ ...options, baseUrl });

  const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const strictVars = options?.strictVariables ?? false;
  const payload = buildPromptFromInput(input, strictVars);

  const url = `${baseUrl}/${functionName}`;
  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseKey ? { apikey: supabaseKey } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        title: payload.title,
        category: 'utility',
        message_type: payload.message_type,
        prompt: payload.prompt,
        language: payload.language,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha de rede ao chamar a Edge Function.';
    throw new Error(message);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `A Edge Function \"${functionName}\" não foi encontrada. Verifique o deploy no projeto Supabase.`,
      );
    }

    const json = await asJson(response);
    const message =
      typeof (json as any)?.error === 'string'
        ? (json as any).error
        : typeof (json as any)?.message === 'string'
          ? (json as any).message
          : `Falha ao gerar (status ${response.status}).`;

    throw new Error(message);
  }

  const json = (await response.json()) as unknown;
  return GeneratedTemplateSchema.parse(json);
};

