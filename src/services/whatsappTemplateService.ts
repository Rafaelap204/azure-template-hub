import { supabase } from '@/integrations/supabase/client';

export interface GenerateTemplatePayload {
  title: string;
  category: 'utility';
  message_type: 'cobranca' | 'vendas';
  prompt: string;
  language: string;
}

export interface GeneratedTemplate {
  whatsapp_template_name: string;
  broadcast_name_suggestion: string;
  category: 'utility';
  message_type: 'cobranca' | 'vendas';
  language?: string;
  header: { format: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'; text?: string };
  body: { text: string };
  footer?: { text?: string };
  buttons?: Array<
    | { type: 'quick_reply'; text: string }
    | { type: 'url'; text: string; url: string }
    | { type: 'phone_number'; text: string; phone_number: string }
    | { type: 'copy_code'; text: string }
    | { type: 'call_request'; text: string }
  >;
  notes?: string[];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    // Retenta se for erro de servidor (5xx) ou 429
    if ((response.status >= 500 && response.status < 600) || response.status === 429) {
      throw new Error(`Server error: ${response.status}`);
    }
    return response;
  } catch (err) {
    if (retries <= 0) throw err;
    await wait(backoff);
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

export const generateWhatsappTemplate = async (payload: GenerateTemplatePayload): Promise<GeneratedTemplate> => {
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  // Em desenvolvimento, usamos o proxy do Vite (/functions/v1/...) para evitar CORS e problemas de rede.
  // Em produção, se a variável VITE_SUPABASE_URL estiver definida, usamos ela.
  // Se não, assumimos que estamos no mesmo domínio ou usamos uma rota relativa.
  
  let baseUrl = '';
  
  if (import.meta.env.DEV) {
    // Em DEV, rota relativa para ativar o proxy do Vite
    baseUrl = '/functions/v1';
  } else {
    // Em PROD, usa a URL completa do Supabase
    baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  // Remove trailing slashes para evitar //
  baseUrl = baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/generate-whatsapp-template`;

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseKey ? { apikey: supabaseKey } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Tratamento específico para 404 (Função não encontrada)
      if (response.status === 404) {
        throw new Error(
          'A Edge Function "generate-whatsapp-template" não foi encontrada. Verifique se o deploy foi realizado corretamente no Supabase.'
        );
      }

      let description = `Falha ao gerar (status ${response.status}).`;
      
      // Tenta ler erro JSON, senão texto
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const ctx = await response.json();
          description = ctx?.error ?? ctx?.message ?? JSON.stringify(ctx);
        } catch {
          description = 'Erro ao ler detalhes do erro JSON.';
        }
      } else {
        try {
          const text = await response.text();
          description = text.slice(0, 300) || description;
        } catch {
          description = 'Falha ao ler resposta do servidor.';
        }
      }
      
      throw new Error(description);
    }

    const data = (await response.json()) as GeneratedTemplate;
    if (!data?.body?.text) {
      throw new Error('A IA retornou um template incompleto ou inválido.');
    }

    return data;
  } catch (err) {
    console.error('Erro no generateWhatsappTemplate:', err);
    throw err; // Propaga para o componente tratar
  }
};
