import { describe, it, expect, vi } from 'vitest';
import { extractHuggingFaceModelId, fetchHuggingFaceMetadata } from '../src/registry/huggingface';
import worker from '../src/index';

const mockEnv = {
  L402_ROOT_SECRET: 'test-secret-32-chars-long-env-key!',
  CREATOR_LIGHTNING_ADDRESS: 'admin@ampero.dev'
};

describe('Hugging Face Model Importer & Metadata Service', () => {
  it('1. extractHuggingFaceModelId devrait parser correctement divers formats d\'URL', () => {
    expect(extractHuggingFaceModelId('https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2'))
      .toBe('mistralai/Mistral-7B-Instruct-v0.2');
    expect(extractHuggingFaceModelId('http://huggingface.co/meta-llama/Llama-3-8B-Instruct/'))
      .toBe('meta-llama/Llama-3-8B-Instruct');
    expect(extractHuggingFaceModelId('Qwen/Qwen2.5-Coder-7B-Instruct'))
      .toBe('Qwen/Qwen2.5-Coder-7B-Instruct');
    expect(extractHuggingFaceModelId('deepseek-ai/DeepSeek-V3'))
      .toBe('deepseek-ai/DeepSeek-V3');
    expect(extractHuggingFaceModelId('')).toBeNull();
    expect(extractHuggingFaceModelId('not-a-valid-model-id')).toBeNull();
  });

  it('2. fetchHuggingFaceMetadata devrait extraire les métadonnées et calculer le prix suggéré', async () => {
    const mockHfResponse = {
      id: 'mistralai/Mistral-7B-Instruct-v0.2',
      author: 'mistralai',
      pipeline_tag: 'text-generation',
      tags: ['mistral', 'text-generation', 'finetuned'],
      downloads: 1650000,
      likes: 3500,
      safetensors: { total: 7241732096 } // ~7B parameters
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockHfResponse
    } as any);

    const result = await fetchHuggingFaceMetadata('https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2', mockFetch);

    expect(result.success).toBe(true);
    expect(result.model_id).toBe('mistralai/Mistral-7B-Instruct-v0.2');
    expect(result.name).toBe('mistral_7b_instruct_v0_2');
    expect(result.parameters).toBe('~7B-8B');
    expect(result.suggested_price_sats).toBe(5);
    expect(result.endpoint).toBe('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2');
    expect(result.description).toContain('1.6M+ downloads');
  });

  it('3. fetchHuggingFaceMetadata devrait gérer le cas 404 (Modèle inexistant ou privé)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    } as any);

    const result = await fetchHuggingFaceMetadata('nonexistent/ghost-model-404', mockFetch);

    expect(result.success).toBe(false);
    expect(result.error).toContain('was not found on Hugging Face Hub');
  });

  it('4. Route POST /api/registry/import-huggingface devrait être intégrée dans le Worker', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'google/gemma-2-9b-it',
        author: 'google',
        pipeline_tag: 'text-generation',
        downloads: 450000,
        likes: 1200,
        safetensors: { total: 9241732096 }
      })
    }) as any;

    try {
      const req = new Request('https://ampero.dev/api/registry/import-huggingface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'google/gemma-2-9b-it' })
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.model_id).toBe('google/gemma-2-9b-it');
      expect(data.name).toBe('gemma_2_9b_it');
      expect(data.endpoint).toContain('api-inference.huggingface.co/models/google/gemma-2-9b-it');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('5. Route /api/registry/import-huggingface sans paramètre devrait retourner HTTP 400', async () => {
    const req = new Request('https://ampero.dev/api/registry/import-huggingface', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.error).toContain('required');
  });
});
