'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  KeyRound,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Rocket,
  Settings2,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  groupModelsByChannel,
  groupResultsByChannel,
  type ChannelConfig,
  type ChannelModel,
  type ChannelTestResult,
} from './model-tester-groups';
import styles from './model-tester.module.css';

type ApiConfig = ChannelConfig;
type ModelConfig = ChannelModel;
type TestResult = ChannelTestResult;

type BackendApi = {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

type BackendModel = {
  id: string;
  api_id: string;
  name: string;
  context: number;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

type BackendResult = {
  id: string;
  api_id: string;
  api_name: string;
  model_name: string;
  ok: boolean;
  latency_ms: number;
  status_code?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  request: unknown;
  response: unknown;
  error?: string;
  created_at: string;
};

type BackendState = {
  apis: BackendApi[];
  models: BackendModel[];
  results: BackendResult[];
};

const BACKEND_URL = process.env.NEXT_PUBLIC_MODEL_TEST_API ?? 'http://localhost:8000';
const API_PREFIX = `${BACKEND_URL}/project/model-test`;

function toApi(api: BackendApi): ApiConfig {
  return {
    id: api.id,
    name: api.name,
    baseUrl: api.base_url,
    apiKey: api.api_key,
    enabled: api.enabled,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

function toModel(model: BackendModel): ModelConfig {
  return {
    id: model.id,
    apiId: model.api_id,
    name: model.name,
    context: model.context,
    enabled: model.enabled,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
  };
}

function toResult(result: BackendResult): TestResult {
  return {
    id: result.id,
    apiId: result.api_id,
    apiName: result.api_name,
    model: result.model_name,
    ok: result.ok,
    latencyMs: result.latency_ms,
    statusCode: result.status_code,
    promptTokens: result.prompt_tokens,
    completionTokens: result.completion_tokens,
    totalTokens: result.total_tokens,
    request: result.request,
    response: result.response,
    error: result.error,
    createdAt: result.created_at,
  };
}

function maskKey(key: string) {
  if (!key) return '未填写';
  if (key.length < 10) return '********';
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}

function formatNumber(value?: number) {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(value?: string) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

function shortUrl(value: string) {
  if (!value) return '未填写渠道地址';
  try {
    return new URL(value).host;
  } catch {
    return value.replace(/^https?:\/\//, '') || value;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail ?? '请求失败');
  }
  return payload as T;
}

function Chart({ option }: { option: EChartsOption }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: import('echarts').ECharts | undefined;
    let cancelled = false;

    async function mount() {
      const echarts = await import('echarts');
      if (!ref.current || cancelled) return;

      chart = echarts.init(ref.current, undefined, { renderer: 'canvas' });
      chart.setOption(option);
      const resize = () => chart?.resize();
      window.addEventListener('resize', resize);

      return () => window.removeEventListener('resize', resize);
    }

    let cleanup: (() => void) | undefined;
    mount().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
      chart?.dispose();
    };
  }, [option]);

  return <div className={styles.chart} ref={ref} />;
}

export function ModelTester() {
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(512);
  const [concurrency, setConcurrency] = useState(4);
  const [perApiLimit, setPerApiLimit] = useState(2);
  const [results, setResults] = useState<TestResult[]>([]);
  const [selected, setSelected] = useState<TestResult | null>(null);
  const [newModel, setNewModel] = useState('');
  const [activeApiId, setActiveApiId] = useState('');
  const [loadingModels, setLoadingModels] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('正在读取后端数据库...');
  const [expandedModelChannels, setExpandedModelChannels] = useState<Record<string, boolean>>({});
  const [expandedResultChannels, setExpandedResultChannels] = useState<Record<string, boolean>>({});

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const state = await requestJson<BackendState>(`${API_PREFIX}/state`);
      const nextApis = state.apis.map(toApi);
      const nextModels = state.models.map(toModel);
      setApis(nextApis);
      setModels(nextModels);
      setResults(state.results.map(toResult));
      setActiveApiId((current) => current || nextApis[0]?.id || '');
      setNotice(`已从数据库读取 ${nextApis.length} 个 API、${nextModels.length} 个模型。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '无法读取后端数据库，请确认 FastAPI 已启动。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadState();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadState]);

  const activeModels = useMemo(
    () => models.filter((model) => model.enabled && apis.some((api) => api.id === model.apiId && api.enabled)),
    [apis, models]
  );

  const modelGroups = useMemo(() => groupModelsByChannel(apis, models), [apis, models]);
  const resultGroups = useMemo(() => groupResultsByChannel(results), [results]);

  const summary = useMemo(() => {
    const total = results.length;
    const success = results.filter((item) => item.ok).length;
    const avgLatency = total ? Math.round(results.reduce((sum, item) => sum + item.latencyMs, 0) / total) : 0;
    const totalTokens = results.reduce((sum, item) => sum + (item.totalTokens ?? 0), 0);

    return { total, success, failed: total - success, avgLatency, totalTokens };
  }, [results]);

  const latencyOption = useMemo<EChartsOption>(
    () => ({
      grid: { left: 44, right: 18, top: 22, bottom: 44 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#64748b', rotate: results.length > 4 ? 28 : 0 },
        data: results.map((item) => item.model),
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#eef2f7' } },
      },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          itemStyle: { color: '#111827', borderRadius: [6, 6, 0, 0] },
          data: results.map((item) => item.latencyMs),
        },
      ],
    }),
    [results]
  );

  const statusOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: '#64748b' } },
      series: [
        {
          type: 'pie',
          radius: ['54%', '78%'],
          center: ['50%', '42%'],
          label: { color: '#334155' },
          data: [
            { name: '成功', value: summary.success, itemStyle: { color: '#14cfc9' } },
            { name: '失败', value: summary.failed, itemStyle: { color: '#111827' } },
          ],
        },
      ],
    }),
    [summary.failed, summary.success]
  );

  const tokenOption = useMemo<EChartsOption>(
    () => ({
      grid: { left: 44, right: 18, top: 24, bottom: 42 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#64748b', rotate: results.length > 4 ? 28 : 0 },
        data: results.map((item) => item.model),
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#eef2f7' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: '#14cfc9' },
          itemStyle: { color: '#14cfc9' },
          areaStyle: { color: 'rgba(20, 207, 201, 0.12)' },
          data: results.map((item) => item.totalTokens ?? 0),
        },
      ],
    }),
    [results]
  );

  const addApi = async () => {
    try {
      const api = await requestJson<BackendApi>(`${API_PREFIX}/apis`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const nextApi = toApi(api);
      setApis((items) => [...items, nextApi]);
      setActiveApiId(nextApi.id);
      setNotice('已在数据库中创建新的 API 配置。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '创建 API 失败。');
    }
  };

  const updateApiLocal = (id: string, patch: Partial<ApiConfig>) => {
    setApis((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const saveApi = async (api: ApiConfig) => {
    try {
      const saved = await requestJson<BackendApi>(`${API_PREFIX}/apis/${api.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: api.name,
          base_url: api.baseUrl,
          api_key: api.apiKey,
          enabled: api.enabled,
        }),
      });
      updateApiLocal(api.id, toApi(saved));
      setNotice(`已保存 API：${saved.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存 API 失败。');
    }
  };

  const toggleApi = async (api: ApiConfig) => {
    updateApiLocal(api.id, { enabled: !api.enabled });
    await saveApi({ ...api, enabled: !api.enabled });
  };

  const removeApi = async (id: string) => {
    try {
      await requestJson(`${API_PREFIX}/apis/${id}`, { method: 'DELETE' });
      setApis((items) => items.filter((item) => item.id !== id));
      setModels((items) => items.filter((item) => item.apiId !== id));
      setActiveApiId((current) => (current === id ? apis.find((item) => item.id !== id)?.id ?? '' : current));
      setNotice('已从数据库删除 API 和关联模型。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除 API 失败。');
    }
  };

  const fetchModels = async (api: ApiConfig) => {
    setLoadingModels(api.id);
    setNotice(`正在从 ${api.name} 获取模型列表...`);
    try {
      const payload = await requestJson<BackendModel[]>(`${API_PREFIX}/apis/${api.id}/fetch-models`, { method: 'POST' });
      const fetched = payload.map(toModel);
      setModels((items) => [...items.filter((item) => item.apiId !== api.id), ...fetched]);
      setNotice(`已从服务端同步 ${fetched.length} 个模型。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '获取模型失败。');
    } finally {
      setLoadingModels(null);
    }
  };

  const addModel = async () => {
    if (!newModel.trim() || !activeApiId) return;
    try {
      const model = await requestJson<BackendModel>(`${API_PREFIX}/models`, {
        method: 'POST',
        body: JSON.stringify({ api_id: activeApiId, name: newModel.trim(), context: 128000, enabled: true }),
      });
      setModels((items) => [...items, toModel(model)]);
      setNewModel('');
      setNotice('已在数据库中添加模型。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '添加模型失败。');
    }
  };

  const updateModel = async (model: ModelConfig, patch: Partial<ModelConfig>) => {
    const next = { ...model, ...patch };
    setModels((items) => items.map((item) => (item.id === model.id ? next : item)));
    try {
      const saved = await requestJson<BackendModel>(`${API_PREFIX}/models/${model.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: next.name, context: next.context, enabled: next.enabled }),
      });
      setModels((items) => items.map((item) => (item.id === model.id ? toModel(saved) : item)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新模型失败。');
    }
  };

  const removeModel = async (id: string) => {
    try {
      await requestJson(`${API_PREFIX}/models/${id}`, { method: 'DELETE' });
      setModels((items) => items.filter((item) => item.id !== id));
      setNotice('已从数据库删除模型。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除模型失败。');
    }
  };

  const toggleModelChannel = (id: string) => {
    setExpandedModelChannels((items) => ({ ...items, [id]: !(items[id] ?? true) }));
  };

  const toggleResultChannel = (id: string) => {
    setExpandedResultChannels((items) => ({ ...items, [id]: !(items[id] ?? true) }));
  };

  const runTests = async () => {
    setTesting(true);
    setNotice(`开始批量测试 ${activeModels.length} 个模型...`);
    try {
      const payload = await requestJson<BackendResult[]>(`${API_PREFIX}/tests/batch`, {
        method: 'POST',
        body: JSON.stringify({
          input: prompt,
          max_tokens: maxTokens,
          temperature,
          concurrency,
          per_api_limit: perApiLimit,
          model_ids: activeModels.map((model) => model.id),
        }),
      });
      const nextResults = payload.map(toResult);
      setResults((items) => {
        const byId = new Map<string, TestResult>();
        for (const result of [...nextResults, ...items]) {
          byId.set(result.id, result);
        }
        return Array.from(byId.values());
      });
      setNotice(`测试完成，已写入数据库 ${nextResults.length} 条结果。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '测试失败，请确认 FastAPI 后端已启动。');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <div>
            <span>Model Lab</span>
            <strong>模型测试</strong>
          </div>
          <button className={styles.iconButton} onClick={loadState} aria-label="刷新数据库状态">
            <RefreshCw size={16} />
          </button>
        </div>
        <nav className={styles.sideNav} aria-label="project sections">
          {[
            ['概览图表', BarChart3],
            ['渠道配置', KeyRound],
            ['模型配置', Bot],
            ['批量测试', Rocket],
            ['结果详情', Eye],
          ].map(([label, Icon]) => {
            const IconComponent = Icon as typeof BarChart3;
            return (
              <a key={label as string} href={`#${label}`}>
                <IconComponent size={15} />
                <span>{label as string}</span>
                <ChevronRight size={14} />
              </a>
            );
          })}
        </nav>
      </aside>

      <section className={styles.content}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>OpenAI compatible benchmark</p>
            <h1>模型测试控制台</h1>
          </div>
          <button className={styles.primaryButton} disabled={testing || loading || !activeModels.length || !prompt.trim()} onClick={runTests}>
            {testing ? <Loader2 className={styles.spin} size={16} /> : <Rocket size={16} />}
            {testing ? '测试中' : '开始批量测试'}
          </button>
        </header>

        <div className={styles.notice}>
          <ShieldCheck size={16} />
          <span>{notice}</span>
        </div>

        <section id="概览图表" className={styles.statsGrid}>
          <article className={styles.statCard}>
            <span>测试任务</span>
            <strong>{summary.total}</strong>
            <small>成功 {summary.success} / 失败 {summary.failed}</small>
          </article>
          <article className={styles.statCard}>
            <span>平均延迟</span>
            <strong>{summary.avgLatency || '--'} ms</strong>
            <small>按数据库结果计算</small>
          </article>
          <article className={styles.statCard}>
            <span>总 Token</span>
            <strong>{formatNumber(summary.totalTokens)}</strong>
            <small>prompt + completion</small>
          </article>
          <article className={styles.statCard}>
            <span>渠道 / 模型</span>
            <strong>
              {apis.length} / {models.length}
            </strong>
            <small>{activeModels.length} 个模型启用</small>
          </article>
        </section>

        <section className={styles.chartGrid}>
          <article className={styles.panel}>
            <div className={styles.panelTitle}>
              <h2>延迟趋势</h2>
              <Activity size={17} />
            </div>
            <Chart option={latencyOption} />
          </article>
          <article className={styles.panel}>
            <div className={styles.panelTitle}>
              <h2>状态分布</h2>
              <CheckCircle2 size={17} />
            </div>
            <Chart option={statusOption} />
          </article>
          <article className={styles.panelWide}>
            <div className={styles.panelTitle}>
              <h2>Token 消耗</h2>
              <Network size={17} />
            </div>
            <Chart option={tokenOption} />
          </article>
        </section>

        <section id="渠道配置" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>渠道配置</h2>
            <button className={styles.smallButton} onClick={addApi}>
              <Plus size={14} /> 添加渠道
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.channelTable}>
              <thead>
                <tr>
                  <th aria-label="展开" />
                  <th>名称</th>
                  <th>渠道地址</th>
                  <th>状态</th>
                  <th>支持的模型</th>
                  <th>健康状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {modelGroups.map((group) => {
                  const api = group.channel;
                  const expanded = expandedModelChannels[api.id] ?? true;
                  const visibleModels = group.models.slice(0, 4);

                  return (
                    <Fragment key={api.id}>
                      <tr className={styles.channelRow}>
                        <td>
                          <button className={styles.disclosureButton} onClick={() => toggleModelChannel(api.id)} aria-label={`${expanded ? '收起' : '展开'} ${api.name}`}>
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td>
                          <div className={styles.channelNameCell}>
                            <strong>{api.name}</strong>
                            <span>密钥 {maskKey(api.apiKey)}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.mutedText}>{shortUrl(api.baseUrl)}</span>
                        </td>
                        <td>
                          <button
                            className={`${styles.switchButton} ${api.enabled ? styles.switchButtonOn : ''}`}
                            onClick={() => toggleApi(api)}
                            aria-pressed={api.enabled}
                          >
                            <span />
                          </button>
                        </td>
                        <td>
                          <div className={styles.modelChips}>
                            {visibleModels.length ? (
                              visibleModels.map((model) => (
                                <span className={styles.modelChip} key={model.id}>
                                  {model.name}
                                </span>
                              ))
                            ) : (
                              <span className={styles.mutedText}>暂无模型</span>
                            )}
                            {group.models.length > visibleModels.length ? <span className={styles.modelChip}>+{group.models.length - visibleModels.length}</span> : null}
                          </div>
                        </td>
                        <td>
                          <div className={styles.healthBars} aria-label={`${api.name} 健康状态`}>
                            {Array.from({ length: 14 }).map((_, item) => (
                              <span className={item < (api.enabled ? 11 : 3) ? styles.healthBarActive : ''} key={item} />
                            ))}
                          </div>
                        </td>
                        <td>{formatDate(api.createdAt)}</td>
                        <td>
                          <div className={styles.rowActions}>
                            <button className={styles.iconButton} onClick={() => fetchModels(api)} aria-label="获取模型">
                              {loadingModels === api.id ? <Loader2 className={styles.spin} size={15} /> : <RefreshCw size={15} />}
                            </button>
                            <button className={styles.iconButton} onClick={() => removeApi(api.id)} aria-label="删除渠道">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className={styles.channelDetailRow}>
                          <td />
                          <td colSpan={7}>
                            <div className={styles.channelEditor}>
                              <label>
                                <span>渠道名称</span>
                                <input value={api.name} onBlur={() => saveApi(api)} onChange={(event) => updateApiLocal(api.id, { name: event.target.value })} />
                              </label>
                              <label>
                                <span>渠道地址</span>
                                <input value={api.baseUrl} onBlur={() => saveApi(api)} onChange={(event) => updateApiLocal(api.id, { baseUrl: event.target.value })} />
                              </label>
                              <label>
                                <span>渠道密钥</span>
                                <input
                                  type="password"
                                  value={api.apiKey}
                                  placeholder="sk-..."
                                  onBlur={() => saveApi(api)}
                                  onChange={(event) => updateApiLocal(api.id, { apiKey: event.target.value })}
                                />
                              </label>
                              <small>已启用模型 {group.enabledModelCount} 个 · 更新时间 {formatDate(api.updatedAt)}</small>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!apis.length ? <p className={styles.empty}>数据库中还没有渠道。点击“添加渠道”创建第一条配置。</p> : null}
          </div>
        </section>

        <section id="模型配置" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>模型配置</h2>
            <div className={styles.inlineControls}>
              <select value={activeApiId} onChange={(event) => setActiveApiId(event.target.value)}>
                <option value="">选择渠道</option>
                {apis.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name}
                  </option>
                ))}
              </select>
              <input value={newModel} placeholder="手动添加模型 ID" onChange={(event) => setNewModel(event.target.value)} />
              <button className={styles.smallButton} disabled={!activeApiId || !newModel.trim()} onClick={addModel}>
                <Plus size={14} /> 添加模型
              </button>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.modelTable}>
              <thead>
                <tr>
                  <th aria-label="展开" />
                  <th>渠道</th>
                  <th>状态</th>
                  <th>模型数量</th>
                  <th>上下文</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {modelGroups.map((group) => {
                  const expanded = expandedModelChannels[group.channel.id] ?? true;

                  return (
                    <Fragment key={group.channel.id}>
                      <tr className={styles.channelRow}>
                        <td>
                          <button
                            className={styles.disclosureButton}
                            onClick={() => toggleModelChannel(group.channel.id)}
                            aria-label={`${expanded ? '收起' : '展开'} ${group.channel.name} 模型`}
                          >
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td>
                          <div className={styles.channelNameCell}>
                            <strong>{group.channel.name}</strong>
                            <span>{shortUrl(group.channel.baseUrl)}</span>
                          </div>
                        </td>
                        <td>{group.channel.enabled ? <span className={styles.statusPill}>已启用</span> : <span className={styles.statusPillMuted}>已停用</span>}</td>
                        <td>
                          {group.enabledModelCount} / {group.models.length}
                        </td>
                        <td>{group.models.length ? formatNumber(Math.max(...group.models.map((model) => model.context))) : '--'}</td>
                        <td>
                          <button className={styles.smallButton} onClick={() => fetchModels(group.channel)}>
                            {loadingModels === group.channel.id ? <Loader2 className={styles.spin} size={14} /> : <RefreshCw size={14} />}
                            同步
                          </button>
                        </td>
                      </tr>
                      {expanded
                        ? group.models.map((model) => (
                            <tr className={styles.modelChildRow} key={model.id}>
                              <td />
                              <td colSpan={2}>
                                <label className={styles.modelToggle}>
                                  <input checked={model.enabled} type="checkbox" onChange={(event) => updateModel(model, { enabled: event.target.checked })} />
                                  <span>{model.name}</span>
                                </label>
                              </td>
                              <td>{model.enabled ? '启用' : '停用'}</td>
                              <td>{formatNumber(model.context)}</td>
                              <td>
                                <button type="button" className={styles.iconButton} onClick={() => removeModel(model.id)} aria-label="删除模型">
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!models.length ? <p className={styles.empty}>数据库中还没有模型。可以先获取模型，或手动添加模型 ID。</p> : null}
          </div>
        </section>

        <section id="批量测试" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>测试输入和并发限制</h2>
            <div className={styles.panelActions}>
              <Settings2 size={17} />
              <button className={styles.primaryButton} disabled={testing || loading || !activeModels.length || !prompt.trim()} onClick={runTests}>
                {testing ? <Loader2 className={styles.spin} size={16} /> : <Rocket size={16} />}
                {testing ? '测试中' : '开始测试'}
              </button>
            </div>
          </div>
          <div className={styles.testGrid}>
            <label className={styles.promptBox}>
              <span>自定义测试输入</span>
              <textarea value={prompt} placeholder="输入你要发送给每个模型的测试内容..." onChange={(event) => setPrompt(event.target.value)} />
            </label>
            <div className={styles.configGrid}>
              <label>
                <span>全局并发数量</span>
                <input min={1} type="number" value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))} />
              </label>
              <label>
                <span>单 API 并发限制</span>
                <input min={1} type="number" value={perApiLimit} onChange={(event) => setPerApiLimit(Number(event.target.value))} />
              </label>
              <label>
                <span>Max Tokens</span>
                <input min={1} type="number" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} />
              </label>
              <label>
                <span>Temperature</span>
                <input
                  max={2}
                  min={0}
                  step={0.1}
                  type="number"
                  value={temperature}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                />
              </label>
            </div>
          </div>
        </section>

        <section id="结果详情" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>渠道 / 模型测试结果</h2>
            <TerminalSquare size={17} />
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.resultTable}>
              <thead>
                <tr>
                  <th aria-label="展开" />
                  <th>状态</th>
                  <th>渠道 / 模型</th>
                  <th>测试次数</th>
                  <th>成功率</th>
                  <th>延迟</th>
                  <th>Token</th>
                  <th>最近测试</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {resultGroups.map((group) => {
                  const expanded = expandedResultChannels[group.channelId] ?? true;
                  const successRate = group.attemptCount ? Math.round((group.successCount / group.attemptCount) * 100) : 0;

                  return (
                    <Fragment key={group.channelId}>
                      <tr className={styles.channelRow}>
                        <td>
                          <button
                            className={styles.disclosureButton}
                            onClick={() => toggleResultChannel(group.channelId)}
                            aria-label={`${expanded ? '收起' : '展开'} ${group.channelName} 测试结果`}
                          >
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </td>
                        <td>{group.successCount === group.attemptCount ? <CheckCircle2 className={styles.ok} size={17} /> : <XCircle className={styles.fail} size={17} />}</td>
                        <td>
                          <div className={styles.channelNameCell}>
                            <strong>{group.channelName}</strong>
                            <span>{group.models.length} 个模型已合并</span>
                          </div>
                        </td>
                        <td>{group.attemptCount}</td>
                        <td>{successRate}%</td>
                        <td>{group.avgLatencyMs} ms</td>
                        <td>{formatNumber(group.totalTokens)}</td>
                        <td>{formatDate(group.latestResult.createdAt)}</td>
                        <td>
                          <button className={styles.smallButton} onClick={() => setSelected(group.latestResult)}>
                            查看最近
                          </button>
                        </td>
                      </tr>
                      {expanded
                        ? group.models.map((model) => {
                            const modelSuccessRate = model.attemptCount ? Math.round((model.successCount / model.attemptCount) * 100) : 0;

                            return (
                              <tr className={styles.modelChildRow} key={`${group.channelId}-${model.model}`}>
                                <td />
                                <td>
                                  {model.successCount === model.attemptCount ? (
                                    <CheckCircle2 className={styles.ok} size={16} />
                                  ) : (
                                    <XCircle className={styles.fail} size={16} />
                                  )}
                                </td>
                                <td>{model.model}</td>
                                <td>{model.attemptCount}</td>
                                <td>{modelSuccessRate}%</td>
                                <td>{model.avgLatencyMs} ms</td>
                                <td>{formatNumber(model.totalTokens)}</td>
                                <td>{formatDate(model.latestResult.createdAt)}</td>
                                <td>
                                  <button className={styles.smallButton} onClick={() => setSelected(model.latestResult)}>
                                    查看
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!results.length ? <p className={styles.empty}>数据库中还没有测试结果。</p> : null}
          </div>
        </section>
      </section>

      {selected ? (
        <div className={styles.drawerOverlay} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <span>{selected.apiName}</span>
                <h2>{selected.model}</h2>
              </div>
              <button className={styles.iconButton} onClick={() => setSelected(null)}>
                <XCircle size={18} />
              </button>
            </div>
            <div className={styles.detailStats}>
              <span>延迟 {selected.latencyMs} ms</span>
              <span>Token {formatNumber(selected.totalTokens)}</span>
              <span>{selected.ok ? '成功' : '失败'}</span>
            </div>
            <h3>请求详情</h3>
            <pre>{JSON.stringify(selected.request, null, 2)}</pre>
            <h3>响应详情</h3>
            <pre>{JSON.stringify(selected.response ?? selected.error, null, 2)}</pre>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
