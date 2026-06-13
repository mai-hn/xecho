'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  BarChart3,
  Bot,
  CheckCircle2,
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

import styles from './model-tester.module.css';

type ApiConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
};

type ModelConfig = {
  id: string;
  apiId: string;
  name: string;
  context: number;
  enabled: boolean;
};

type TestResult = {
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

type BackendApi = {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  enabled: boolean;
};

type BackendModel = {
  id: string;
  api_id: string;
  name: string;
  context: number;
  enabled: boolean;
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
  };
}

function toModel(model: BackendModel): ModelConfig {
  return {
    id: model.id,
    apiId: model.api_id,
    name: model.name,
    context: model.context,
    enabled: model.enabled,
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
      setResults(nextResults);
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
            ['API 密钥', KeyRound],
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
            <p>所有 API、模型和测试结果都从 SQLModel 数据库读取；前端只负责编辑和触发请求。</p>
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
            <span>API / 模型</span>
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

        <section id="API 密钥" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>API 地址和密钥</h2>
            <button className={styles.smallButton} onClick={addApi}>
              <Plus size={14} /> 添加 API
            </button>
          </div>
          <div className={styles.apiList}>
            {apis.length ? (
              apis.map((api) => (
                <article className={styles.apiCard} key={api.id}>
                  <label>
                    <span>名称</span>
                    <input value={api.name} onBlur={() => saveApi(api)} onChange={(event) => updateApiLocal(api.id, { name: event.target.value })} />
                  </label>
                  <label>
                    <span>API Base URL</span>
                    <input value={api.baseUrl} onBlur={() => saveApi(api)} onChange={(event) => updateApiLocal(api.id, { baseUrl: event.target.value })} />
                  </label>
                  <label>
                    <span>API Key</span>
                    <input
                      type="password"
                      value={api.apiKey}
                      placeholder="sk-..."
                      onBlur={() => saveApi(api)}
                      onChange={(event) => updateApiLocal(api.id, { apiKey: event.target.value })}
                    />
                  </label>
                  <div className={styles.apiActions}>
                    <button className={styles.toggleButton} onClick={() => toggleApi(api)}>
                      {api.enabled ? '已启用' : '已停用'}
                    </button>
                    <button className={styles.smallButton} onClick={() => fetchModels(api)}>
                      {loadingModels === api.id ? <Loader2 className={styles.spin} size={14} /> : <RefreshCw size={14} />}
                      获取模型
                    </button>
                    <button className={styles.iconButton} onClick={() => removeApi(api.id)} aria-label="删除 API">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <small className={styles.keyHint}>Key: {maskKey(api.apiKey)}</small>
                </article>
              ))
            ) : (
              <p className={styles.empty}>数据库中还没有 API。点击“添加 API”创建第一条配置。</p>
            )}
          </div>
        </section>

        <section id="模型配置" className={styles.panel}>
          <div className={styles.panelTitle}>
            <h2>模型配置</h2>
            <div className={styles.inlineControls}>
              <select value={activeApiId} onChange={(event) => setActiveApiId(event.target.value)}>
                <option value="">选择 API</option>
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
          <div className={styles.modelList}>
            {models.length ? (
              models.map((model) => {
                const api = apis.find((item) => item.id === model.apiId);
                return (
                  <label className={styles.modelItem} key={model.id}>
                    <input checked={model.enabled} type="checkbox" onChange={(event) => updateModel(model, { enabled: event.target.checked })} />
                    <span>
                      <strong>{model.name}</strong>
                      <small>{api?.name ?? 'Unknown API'} · context {formatNumber(model.context)}</small>
                    </span>
                    <button type="button" className={styles.iconButton} onClick={() => removeModel(model.id)} aria-label="删除模型">
                      <Trash2 size={14} />
                    </button>
                  </label>
                );
              })
            ) : (
              <p className={styles.empty}>数据库中还没有模型。可以先获取模型，或手动添加模型 ID。</p>
            )}
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
            <h2>每个 API / 模型测试结果</h2>
            <TerminalSquare size={17} />
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>状态</th>
                  <th>API</th>
                  <th>模型</th>
                  <th>延迟</th>
                  <th>Token</th>
                  <th>状态码</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.id}>
                    <td>{item.ok ? <CheckCircle2 className={styles.ok} size={17} /> : <XCircle className={styles.fail} size={17} />}</td>
                    <td>{item.apiName}</td>
                    <td>{item.model}</td>
                    <td>{item.latencyMs} ms</td>
                    <td>{formatNumber(item.totalTokens)}</td>
                    <td>{item.statusCode ?? '--'}</td>
                    <td>
                      <button className={styles.smallButton} onClick={() => setSelected(item)}>
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
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
