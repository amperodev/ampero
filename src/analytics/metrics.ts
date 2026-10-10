/**
 * Internal Tool Execution & Analytics Tracker for Cloudflare KV.
 * 
 * 🔒 PRIVACY-FIRST / ADMIN ONLY:
 * This data is kept strictly private in Cloudflare KV for the operator.
 * It is never exposed publicly on the catalogue or marketing pages.
 */

export interface ToolMetric {
  executions: number;
  total_sats: number;
  last_executed_at: string;
}

export interface MetricsSummary {
  total_executions: number;
  total_sats: number;
  last_updated: string;
  tools: Record<string, ToolMetric>;
}

export const inMemoryMetrics: MetricsSummary = {
  total_executions: 0,
  total_sats: 0,
  last_updated: new Date().toISOString(),
  tools: {}
};

export const KV_METRICS_KEY = 'metrics:summary';

/**
 * Records an execution of a given tool, updating both tool-specific and aggregate counters.
 */
export async function recordToolExecution(
  toolName: string,
  satsEarned: number,
  kv?: KVNamespace,
  memoryFallback = inMemoryMetrics
): Promise<void> {
  const now = new Date().toISOString();

  // 1. Update in-memory fallback (for local dev and testing)
  memoryFallback.total_executions = (memoryFallback.total_executions || 0) + 1;
  memoryFallback.total_sats = (memoryFallback.total_sats || 0) + satsEarned;
  memoryFallback.last_updated = now;

  if (!memoryFallback.tools[toolName]) {
    memoryFallback.tools[toolName] = {
      executions: 0,
      total_sats: 0,
      last_executed_at: now
    };
  }
  memoryFallback.tools[toolName].executions += 1;
  memoryFallback.tools[toolName].total_sats += satsEarned;
  memoryFallback.tools[toolName].last_executed_at = now;

  // 2. Persist to Cloudflare KV if bound
  if (kv) {
    try {
      let summary: MetricsSummary;
      const raw = await kv.get(KV_METRICS_KEY);
      if (raw) {
        try {
          summary = JSON.parse(raw);
        } catch {
          summary = {
            total_executions: 0,
            total_sats: 0,
            last_updated: now,
            tools: {}
          };
        }
      } else {
        summary = {
          total_executions: 0,
          total_sats: 0,
          last_updated: now,
          tools: {}
        };
      }

      summary.total_executions = (summary.total_executions || 0) + 1;
      summary.total_sats = (summary.total_sats || 0) + satsEarned;
      summary.last_updated = now;

      if (!summary.tools) summary.tools = {};
      if (!summary.tools[toolName]) {
        summary.tools[toolName] = {
          executions: 0,
          total_sats: 0,
          last_executed_at: now
        };
      }
      summary.tools[toolName].executions = (summary.tools[toolName].executions || 0) + 1;
      summary.tools[toolName].total_sats = (summary.tools[toolName].total_sats || 0) + satsEarned;
      summary.tools[toolName].last_executed_at = now;

      await kv.put(KV_METRICS_KEY, JSON.stringify(summary));
      await kv.put(`metric:tool:${toolName}`, JSON.stringify(summary.tools[toolName]));
    } catch (err) {
      console.error('Failed to persist tool execution to KV:', err);
    }
  }
}

/**
 * Retrieves the full metrics summary from KV or memory fallback.
 */
export async function getMetricsSummary(
  kv?: KVNamespace,
  memoryFallback = inMemoryMetrics
): Promise<MetricsSummary> {
  if (kv) {
    try {
      const raw = await kv.get(KV_METRICS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to retrieve metrics summary from KV:', err);
    }
  }
  return memoryFallback;
}

/**
 * Resets metrics (useful for testing and sandbox environments).
 */
export async function resetMetrics(
  kv?: KVNamespace,
  memoryFallback = inMemoryMetrics
): Promise<void> {
  memoryFallback.total_executions = 0;
  memoryFallback.total_sats = 0;
  memoryFallback.last_updated = new Date().toISOString();
  memoryFallback.tools = {};

  if (kv) {
    try {
      await kv.delete(KV_METRICS_KEY);
    } catch (err) {
      console.error('Failed to reset metrics in KV:', err);
    }
  }
}
