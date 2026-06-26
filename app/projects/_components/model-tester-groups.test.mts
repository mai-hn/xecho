import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ModelChannelGroup, ResultChannelGroup } from './model-tester-groups';

const groupsModuleUrl = new URL('./model-tester-groups.ts', import.meta.url).href;
const { groupModelsByChannel, groupResultsByChannel } = (await import(groupsModuleUrl)) as typeof import('./model-tester-groups');

const channels = [
  { id: 'longcat', name: 'LongCat', baseUrl: 'https://longcat.example/v1', apiKey: 'sk-longcat', enabled: true },
  { id: 'mimo', name: 'MIMO', baseUrl: 'https://mimo.example/v1', apiKey: 'sk-mimo', enabled: false },
];

describe('model tester grouping', () => {
  it('groups model configuration by channel and preserves channel order', () => {
    const groups: ModelChannelGroup[] = groupModelsByChannel(channels, [
      { id: 'model-2', apiId: 'mimo', name: 'mimo-v2-pro', context: 128000, enabled: true },
      { id: 'model-1', apiId: 'longcat', name: 'LongCat-2.0-Preview', context: 128000, enabled: true },
      { id: 'model-3', apiId: 'longcat', name: 'LongCat-1.5', context: 64000, enabled: false },
    ]);

    assert.deepEqual(
      groups.map((group) => [group.channel.id, group.models.map((model) => model.name), group.enabledModelCount]),
      [
        ['longcat', ['LongCat-2.0-Preview', 'LongCat-1.5'], 1],
        ['mimo', ['mimo-v2-pro'], 1],
      ]
    );
  });

  it('merges repeated test attempts into channel and model summaries', () => {
    const groups: ResultChannelGroup[] = groupResultsByChannel([
      {
        id: 'r1',
        apiId: 'longcat',
        apiName: 'LongCat',
        model: 'LongCat-2.0-Preview',
        ok: true,
        latencyMs: 120,
        totalTokens: 100,
        request: {},
        response: {},
        createdAt: '2026-06-24T10:00:00Z',
      },
      {
        id: 'r2',
        apiId: 'longcat',
        apiName: 'LongCat',
        model: 'LongCat-2.0-Preview',
        ok: false,
        latencyMs: 300,
        totalTokens: 40,
        request: {},
        response: {},
        error: 'timeout',
        createdAt: '2026-06-24T10:03:00Z',
      },
      {
        id: 'r3',
        apiId: 'mimo',
        apiName: 'MIMO',
        model: 'mimo-v2-pro',
        ok: true,
        latencyMs: 80,
        totalTokens: 50,
        request: {},
        response: {},
        createdAt: '2026-06-24T09:00:00Z',
      },
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].channelId, 'longcat');
    assert.equal(groups[0].attemptCount, 2);
    assert.equal(groups[0].successCount, 1);
    assert.equal(groups[0].avgLatencyMs, 210);
    assert.equal(groups[0].totalTokens, 140);
    assert.equal(groups[0].latestResult.id, 'r2');
    assert.deepEqual(
      groups[0].models.map((model) => ({
        model: model.model,
        attempts: model.attemptCount,
        latest: model.latestResult.id,
      })),
      [{ model: 'LongCat-2.0-Preview', attempts: 2, latest: 'r2' }]
    );
  });
});
