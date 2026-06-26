export type ChannelConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelModel = {
  id: string;
  apiId: string;
  name: string;
  context: number;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ChannelTestResult = {
  id: string;
  apiId: string;
  apiName: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  statusCode?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  request: unknown;
  response: unknown;
  error?: string;
  createdAt: string;
};

export type ModelChannelGroup = {
  channel: ChannelConfig;
  models: ChannelModel[];
  enabledModelCount: number;
};

export type ResultModelGroup = {
  model: string;
  attempts: ChannelTestResult[];
  attemptCount: number;
  successCount: number;
  avgLatencyMs: number;
  totalTokens: number;
  latestResult: ChannelTestResult;
};

export type ResultChannelGroup = {
  channelId: string;
  channelName: string;
  models: ResultModelGroup[];
  attempts: ChannelTestResult[];
  attemptCount: number;
  successCount: number;
  avgLatencyMs: number;
  totalTokens: number;
  latestResult: ChannelTestResult;
};

function newestFirst(a: ChannelTestResult, b: ChannelTestResult) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function averageLatency(results: ChannelTestResult[]) {
  if (!results.length) return 0;
  return Math.round(results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length);
}

function totalTokens(results: ChannelTestResult[]) {
  return results.reduce((sum, result) => sum + (result.totalTokens ?? 0), 0);
}

export function groupModelsByChannel(channels: ChannelConfig[], models: ChannelModel[]): ModelChannelGroup[] {
  return channels.map((channel) => {
    const channelModels = models.filter((model) => model.apiId === channel.id);

    return {
      channel,
      models: channelModels,
      enabledModelCount: channelModels.filter((model) => model.enabled).length,
    };
  });
}

export function groupResultsByChannel(results: ChannelTestResult[]): ResultChannelGroup[] {
  const channels = new Map<string, ChannelTestResult[]>();

  for (const result of results) {
    const key = result.apiId || result.apiName;
    channels.set(key, [...(channels.get(key) ?? []), result]);
  }

  return Array.from(channels.entries())
    .map(([channelId, attempts]) => {
      const sortedAttempts = [...attempts].sort(newestFirst);
      const modelMap = new Map<string, ChannelTestResult[]>();

      for (const attempt of sortedAttempts) {
        modelMap.set(attempt.model, [...(modelMap.get(attempt.model) ?? []), attempt]);
      }

      const models = Array.from(modelMap.entries())
        .map(([model, modelAttempts]) => {
          const sortedModelAttempts = [...modelAttempts].sort(newestFirst);

          return {
            model,
            attempts: sortedModelAttempts,
            attemptCount: sortedModelAttempts.length,
            successCount: sortedModelAttempts.filter((result) => result.ok).length,
            avgLatencyMs: averageLatency(sortedModelAttempts),
            totalTokens: totalTokens(sortedModelAttempts),
            latestResult: sortedModelAttempts[0],
          };
        })
        .sort((a, b) => newestFirst(a.latestResult, b.latestResult));

      return {
        channelId,
        channelName: sortedAttempts[0]?.apiName ?? channelId,
        models,
        attempts: sortedAttempts,
        attemptCount: sortedAttempts.length,
        successCount: sortedAttempts.filter((result) => result.ok).length,
        avgLatencyMs: averageLatency(sortedAttempts),
        totalTokens: totalTokens(sortedAttempts),
        latestResult: sortedAttempts[0],
      };
    })
    .sort((a, b) => newestFirst(a.latestResult, b.latestResult));
}
