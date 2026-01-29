import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoverEdgeFunctionName,
  generate_template_whatsapp,
  interpolateVariables,
  resetEdgeFunctionDiscoveryCache,
} from './generateTemplateWhatsapp';

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } } })),
      },
    },
  };
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('generateTemplateWhatsapp', () => {
  beforeEach(() => {
    resetEdgeFunctionDiscoveryCache();
    vi.unstubAllGlobals();
  });

  it('interpolateVariables substitui placeholders', () => {
    expect(interpolateVariables('Olá {{nome}}', { nome: 'Felipe' })).toBe('Olá Felipe');
  });

  it('interpolateVariables falha em modo strict quando variável está ausente', () => {
    expect(() => interpolateVariables('Olá {{nome}}', {}, true)).toThrow(/Variáveis ausentes/i);
  });

  it('discoverEdgeFunctionName escolhe o primeiro candidato existente (health!=404)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/functions/v1/a?health=1')) return jsonResponse(404, { code: 'NOT_FOUND' });
      if (url.includes('/functions/v1/b?health=1')) return jsonResponse(200, { ok: true, name: 'b' });
      return jsonResponse(500, { error: 'unexpected' });
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const name = await discoverEdgeFunctionName({ baseUrl: '/functions/v1', candidates: ['a', 'b'] });
    expect(name).toBe('b');
  });

  it('discoverEdgeFunctionName falha quando nenhuma função existe', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(404, { code: 'NOT_FOUND' }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(discoverEdgeFunctionName({ baseUrl: '/functions/v1', candidates: ['a', 'b'] })).rejects.toThrow(
      /Nenhuma Edge Function encontrada/i,
    );
  });

  it('generate_template_whatsapp descobre a função e invoca POST retornando template válido', async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);

      if (url.includes('/functions/v1/a?health=1')) return jsonResponse(404, { code: 'NOT_FOUND' });
      if (url.includes('/functions/v1/b?health=1')) return jsonResponse(200, { ok: true, name: 'b' });

      if (url.endsWith('/functions/v1/b') && init?.method === 'POST') {
        return jsonResponse(200, {
          whatsapp_template_name: 'teste_template',
          broadcast_name_suggestion: 'Teste',
          category: 'utility',
          message_type: 'cobranca',
          language: 'pt_BR',
          header: { format: 'NONE' },
          body: { text: 'Olá {{nome}}' },
          footer: { text: 'Rodapé' },
          buttons: [{ type: 'quick_reply', text: 'OK' }],
        });
      }

      return jsonResponse(500, { error: 'unexpected' });
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await generate_template_whatsapp(
      {
        kind: 'generator_prompt',
        title: 'Teste',
        message_type: 'cobranca',
        prompt: 'Olá',
        language: 'pt_BR',
      },
      { baseUrl: '/functions/v1', candidates: ['a', 'b'] },
    );

    expect(result.category).toBe('utility');
    expect(result.body.text).toBeTruthy();
    expect(calls.some((c) => c.startsWith('POST '))).toBe(true);
  });
});

