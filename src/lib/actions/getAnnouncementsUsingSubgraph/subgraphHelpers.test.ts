import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT } from '../../../config';
import {
  convertSubgraphEntityToAnnouncementLog,
  fetchPages
} from './subgraphHelpers';

type MockResponse = {
  [key: string]: { id: string }[];
};

describe('fetchPages', () => {
  let mockClient: GraphQLClient;
  let mockRequest: ReturnType<typeof mock>;

  beforeEach(() => {
    mockRequest = mock((_query: string, _variables: Record<string, unknown>) =>
      Promise.resolve({} as MockResponse)
    );
    mockClient = {
      request: mockRequest
    } as unknown as GraphQLClient;
  });

  test('should fetch a single page when there are fewer items than the page size', async () => {
    const mockResponse = { entities: [{ id: '1' }, { id: '2' }] };
    mockRequest.mockReturnValue(Promise.resolve(mockResponse));

    const generator = fetchPages({
      client: mockClient,
      gqlQuery: 'query { entities(__WHERE_CLAUSE__) { id } }',
      pageSize: 5,
      filter: 'someFilter: true',
      entity: 'entities'
    });

    const result = await generator.next();
    expect(result.value).toEqual(mockResponse.entities);
    expect(result.done).toBe(false);

    const endResult = await generator.next();
    expect(endResult.done).toBe(true);
  });

  test('should fetch multiple pages when there are more items than the page size', async () => {
    const mockResponses = [
      { entities: [{ id: '1' }, { id: '2' }, { id: '3' }] },
      { entities: [{ id: '4' }, { id: '5' }] },
      { entities: [] }
    ];
    mockRequest
      .mockReturnValueOnce(Promise.resolve(mockResponses[0]))
      .mockReturnValueOnce(Promise.resolve(mockResponses[1]))
      .mockReturnValueOnce(Promise.resolve(mockResponses[2]));

    const generator = fetchPages({
      client: mockClient,
      gqlQuery: 'query { entities(__WHERE_CLAUSE__) { id } }',
      pageSize: 3,
      filter: 'someFilter: true',
      entity: 'entities'
    });

    const results = [];
    for await (const batch of generator) {
      results.push(...batch);
    }

    expect(results).toEqual([
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' }
    ]);
  });

  test('should handle errors gracefully', async () => {
    mockRequest.mockReturnValue(Promise.reject(new Error('GraphQL error')));

    const generator = fetchPages({
      client: mockClient,
      gqlQuery: 'query { entities(__WHERE_CLAUSE__) { id } }',
      pageSize: 3,
      filter: 'someFilter: true',
      entity: 'entities'
    });

    try {
      await generator.next();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('GraphQL error');
    }
  });

  test('should use lastId for pagination', async () => {
    const mockResponses = [
      { entities: [{ id: '3' }, { id: '2' }, { id: '1' }] },
      { entities: [] }
    ];
    mockRequest
      .mockReturnValueOnce(Promise.resolve(mockResponses[0]))
      .mockReturnValueOnce(Promise.resolve(mockResponses[1]));

    const generator = fetchPages({
      client: mockClient,
      gqlQuery: 'query { entities(__WHERE_CLAUSE__) { id } }',
      pageSize: 3,
      filter: 'someFilter: true',
      entity: 'entities',
      lastId: '4'
    });

    const results = [];
    for await (const batch of generator) {
      results.push(...batch);
    }

    expect(results).toEqual([{ id: '3' }, { id: '2' }, { id: '1' }]);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining('id_lt: $id_lt'),
      expect.objectContaining({ id_lt: '4' })
    );
  });

  test('should handle empty response', async () => {
    mockRequest.mockReturnValue(Promise.resolve({ entities: [] }));

    const generator = fetchPages({
      client: mockClient,
      gqlQuery: 'query { entities(__WHERE_CLAUSE__) { id } }',
      pageSize: 3,
      filter: 'someFilter: true',
      entity: 'entities'
    });

    const result = await generator.next();
    expect(result.done).toBe(true);
    expect(result.value).toBeUndefined();
  });
});

describe('convertSubgraphEntityToAnnouncementLog', () => {
  test('should convert SubgraphAnnouncementEntity to AnnouncementLog', () => {
    const subgraphEntity = {
      id: '1',
      blockHash: '0x123',
      blockNumber: '100',
      logIndex: '1',
      removed: false,
      transactionHash: '0xabc',
      transactionIndex: '0',
      topics: ['0xtopic1', '0xtopic2'],
      data: '0xdata',
      schemeId: '1',
      stealthAddress: '0xstealth',
      caller: '0xcaller',
      ephemeralPubKey: '0xephemeral',
      metadata: '0xmetadata'
    };

    const result = convertSubgraphEntityToAnnouncementLog(subgraphEntity);

    expect(result).toEqual({
      address: ERC5564_CONTRACT.SEPOLIA,
      blockHash: '0x123',
      blockNumber: BigInt(100),
      logIndex: 1,
      removed: false,
      transactionHash: '0xabc',
      transactionIndex: 0,
      topics: ['0xtopic1', '0xtopic2'],
      data: '0xdata',
      schemeId: BigInt(1),
      stealthAddress: '0xstealth',
      caller: '0xcaller',
      ephemeralPubKey: '0xephemeral',
      metadata: '0xmetadata'
    });
  });

  test('should handle empty topics array', () => {
    const subgraphEntity = {
      id: '1',
      blockHash: '0x123',
      blockNumber: '100',
      logIndex: '1',
      removed: false,
      transactionHash: '0xabc',
      transactionIndex: '0',
      topics: [],
      data: '0xdata',
      schemeId: '1',
      stealthAddress: '0xstealth',
      caller: '0xcaller',
      ephemeralPubKey: '0xephemeral',
      metadata: '0xmetadata'
    };

    const result = convertSubgraphEntityToAnnouncementLog(subgraphEntity);

    expect(result.topics).toEqual([]);
  });

  test('should correctly convert numeric string values', () => {
    const subgraphEntity = {
      id: '1',
      blockHash: '0x123',
      blockNumber: '12345678901234567890', // Large number
      logIndex: '255',
      removed: false,
      transactionHash: '0xabc',
      transactionIndex: '65535',
      topics: ['0xtopic1'],
      data: '0xdata',
      schemeId: '9876543210987654321', // Large number
      stealthAddress: '0xstealth',
      caller: '0xcaller',
      ephemeralPubKey: '0xephemeral',
      metadata: '0xmetadata'
    };

    const result = convertSubgraphEntityToAnnouncementLog(subgraphEntity);

    expect(result.blockNumber).toEqual(BigInt('12345678901234567890'));
    expect(result.logIndex).toEqual(255);
    expect(result.transactionIndex).toEqual(65535);
    expect(result.schemeId).toEqual(BigInt('9876543210987654321'));
  });
});
