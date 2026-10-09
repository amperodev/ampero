/**
 * Outil MCP haute utilité pour agents Bitcoin : Estimation des frais de transaction Mempool en temps réel.
 * Coût : 2 satoshis.
 */

export interface MempoolFeesResult {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  minimumFee: number;
  timestamp: number;
  advice: string;
}

export async function fetchMempoolFeeEstimates(fetchFn: typeof fetch = fetch): Promise<MempoolFeesResult> {
  const res = await fetchFn('https://mempool.space/api/v1/fees/recommended', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'L402-Edge-Agent/1.0'
    }
  });

  if (!res.ok) {
    throw new Error(`Impossible de contacter l'API Mempool (HTTP ${res.status}): ${res.statusText}`);
  }

  const data = (await res.json()) as {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    minimumFee: number;
  };

  const advice = data.fastestFee < 15
    ? 'Bitcoin network is clear: very low fees, fast on-chain transactions recommended.'
    : data.fastestFee < 50
    ? 'Moderate mempool traffic: standard priority recommended.'
    : 'High mempool congestion: prioritize Lightning Network for urgent settlements.';

  return {
    fastestFee: data.fastestFee,
    halfHourFee: data.halfHourFee,
    hourFee: data.hourFee,
    minimumFee: data.minimumFee,
    timestamp: Date.now(),
    advice
  };
}
