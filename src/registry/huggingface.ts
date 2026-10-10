/**
 * Hugging Face Hub Model Importer.
 * Extracts model metadata, task pipeline, parameter count, and formats description and pricing for Ampero M2M registry.
 */

export interface HuggingFaceImportResult {
  success: boolean;
  model_id: string;
  name: string;
  description: string;
  endpoint: string;
  suggested_price_sats: number;
  pipeline_tag?: string;
  author?: string;
  parameters?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  error?: string;
}

/**
 * Extracts clean model ID from full Hugging Face URL or plain ID.
 * Examples:
 * - "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2" -> "mistralai/Mistral-7B-Instruct-v0.2"
 * - "mistralai/Mistral-7B-Instruct-v0.2" -> "mistralai/Mistral-7B-Instruct-v0.2"
 */
export function extractHuggingFaceModelId(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  const trimmed = rawInput.trim();
  // Strip trailing slashes
  const clean = trimmed.replace(/\/+$/, '');

  // If full URL: https://huggingface.co/{owner}/{model}
  const urlMatch = clean.match(/huggingface\.co\/([a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // If plain owner/model
  const plainMatch = clean.match(/^([a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+)$/);
  if (plainMatch && plainMatch[1]) {
    return plainMatch[1];
  }

  return null;
}

/**
 * Fetches public model metadata from Hugging Face API.
 */
export async function fetchHuggingFaceMetadata(
  input: string,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<HuggingFaceImportResult> {
  const modelId = extractHuggingFaceModelId(input);

  if (!modelId) {
    return {
      success: false,
      model_id: input,
      name: '',
      description: '',
      endpoint: '',
      suggested_price_sats: 5,
      error: 'Invalid Hugging Face model format. Expected: owner/model_name or https://huggingface.co/owner/model_name'
    };
  }

  try {
    const res = await fetchFn(`https://huggingface.co/api/models/${modelId}`, {
      headers: {
        'User-Agent': 'Ampero-M2M/0.2.0 (Cloudflare-Worker)'
      }
    });

    if (res.status === 404) {
      return {
        success: false,
        model_id: modelId,
        name: '',
        description: '',
        endpoint: '',
        suggested_price_sats: 5,
        error: `Model "${modelId}" was not found on Hugging Face Hub (it may be private or deleted).`
      };
    }

    if (!res.ok) {
      return {
        success: false,
        model_id: modelId,
        name: '',
        description: '',
        endpoint: '',
        suggested_price_sats: 5,
        error: `Hugging Face API returned HTTP ${res.status}`
      };
    }

    const data = (await res.json()) as any;

    // Calculate parameter size if safetensors info is present
    let paramStr = '';
    let suggestedPrice = 5;
    const totalParams = data.safetensors?.total || data.safetensors?.parameters?.total;

    if (typeof totalParams === 'number' && totalParams > 0) {
      if (totalParams >= 60_000_000_000) {
        paramStr = '~70B';
        suggestedPrice = 10;
      } else if (totalParams >= 30_000_000_000) {
        paramStr = '~32B';
        suggestedPrice = 8;
      } else if (totalParams >= 12_000_000_000) {
        paramStr = '~14B';
        suggestedPrice = 6;
      } else if (totalParams >= 6_000_000_000) {
        paramStr = '~7B-8B';
        suggestedPrice = 5;
      } else if (totalParams >= 2_000_000_000) {
        paramStr = '~3B';
        suggestedPrice = 3;
      } else {
        paramStr = '<2B (SLM)';
        suggestedPrice = 2;
      }
    }

    // Generate tool slug for Ampero
    const [authorPart, modelPart] = modelId.split('/');
    const cleanModel = (modelPart || authorPart)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 36);

    const task = data.pipeline_tag || 'inference';
    const downloadsFormatted =
      data.downloads > 1_000_000
        ? `${(data.downloads / 1_000_000).toFixed(1)}M+`
        : data.downloads > 1_000
        ? `${Math.round(data.downloads / 1_000)}k+`
        : `${data.downloads || 0}`;

    const paramBadge = paramStr ? ` (${paramStr})` : '';
    const desc = `${modelPart || modelId}${paramBadge} by ${authorPart}. Task: ${task}. ${downloadsFormatted} downloads on Hugging Face. Ready for autonomous AI agent execution.`;

    const endpoint = `https://api-inference.huggingface.co/models/${modelId}`;

    return {
      success: true,
      model_id: modelId,
      name: cleanModel,
      description: desc,
      endpoint,
      suggested_price_sats: suggestedPrice,
      pipeline_tag: task,
      author: authorPart,
      parameters: paramStr || undefined,
      downloads: data.downloads,
      likes: data.likes,
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 10) : []
    };
  } catch (err: any) {
    return {
      success: false,
      model_id: modelId,
      name: '',
      description: '',
      endpoint: '',
      suggested_price_sats: 5,
      error: `Network error connecting to Hugging Face: ${err.message}`
    };
  }
}
