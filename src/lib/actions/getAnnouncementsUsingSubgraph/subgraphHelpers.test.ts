import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GraphQLClient } from 'graphql-request';
import { ERC5564_CONTRACT_ADDRESS } from '../../../config';
import {
  MAX_LEGACY_SUBGRAPH_PAGE_SIZE,
  MAX_SUBGRAPH_PAGE_SIZE,
  buildAnnouncementsWhereClause,
  convertSubgraphEntityToAnnouncementLog,
  fetchAnnouncementsBatch,
  fetchAnnouncementsPage
} from './subgraphHelpers';
import type { SubgraphAnnouncementEntity } from './types';

type MockResponse = {
  [key: string]: unknown;
};

const makeSubgraphEntity = (id: string): SubgraphAnnouncementEntity =>
  ({
    blockNumber: '1',
    caller: '0x1234567890123456789012345678901234567890',
    ephemeralPubKey: '0xephemeral',
    id,
    metadata: '0xmetadata',
    schemeId: '1',
    stealthAddress: '0xstealth',
    transactionHash: `0x${id.padStart(64, '0')}`,
    blockHash: '0xblockhash',
    data: '0xdata',
    logIndex: '0',
    removed: false,
    topics: [],
    transactionIndex: '0'
  }) as SubgraphAnnouncementEntity;

const makeOrderedId = (value: number): string =>
  value.toString().padStart(4, '0');

const makeSnapshotMetaResponse = (number: number | string) => ({
  _meta: {
    block: {
      number
    }
  }
});

const buildLegacyFilter = ({
  caller,
  fromBlock,
  schemeId,
  toBlock
}: {
  caller?: string;
  fromBlock?: number;
  schemeId?: number;
  toBlock?: number;
}): string =>
  [
    fromBlock !== undefined ? `blockNumber_gte: ${fromBlock}` : null,
    toBlock !== undefined ? `blockNumber_lte: ${toBlock}` : null,
    schemeId !== undefined ? `schemeId: "${schemeId}"` : null,
    caller ? `caller: "${caller}"` : null
  ]
    .filter(Boolean)
    .join(', ');

const createDatasetBackedMockClient = (
  dataset: SubgraphAnnouncementEntity[]
) => {
  const request = mock(
    (query: string, variables: Record<string, unknown> = {}) => {
      const first = Number(variables.first);
      const idLt =
        typeof variables.id_lt === 'string' ? variables.id_lt : undefined;
      const fromBlockMatch = query.match(/blockNumber_gte: (\d+)/);
      const toBlockMatch = query.match(/blockNumber_lte: (\d+)/);
      const schemeIdMatch = query.match(/schemeId: "(\d+)"/);
      const callerMatch = query.match(/caller: "(0x[a-fA-F0-9]+)"/);

      const filtered = dataset.filter(entity => {
        const blockNumber = Number(entity.blockNumber);

        return (
          (!idLt || entity.id < idLt) &&
          (!fromBlockMatch || blockNumber >= Number(fromBlockMatch[1])) &&
          (!toBlockMatch || blockNumber <= Number(toBlockMatch[1])) &&
          (!schemeIdMatch || entity.schemeId === schemeIdMatch[1]) &&
          (!callerMatch || entity.caller === callerMatch[1])
        );
      });

      return Promise.resolve({
        announcements: filtered.slice(0, first)
      });
    }
  );

  return {
    client: {
      request
    } as unknown as GraphQLClient,
    request
  };
};

describe('fetchAnnouncementsPage helpers', () => {
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

  test('should build an empty where clause when no optional filters are provided', () => {
    expect(buildAnnouncementsWhereClause({})).toBe('');
  });

  test('should build a where clause with all supported typed filters', () => {
    expect(
      buildAnnouncementsWhereClause({
        caller: '0x1234567890123456789012345678901234567890',
        cursor: 'cursor-1',
        fromBlock: 12n,
        schemeId: 7n,
        toBlock: 34
      })
    ).toBe(
      'blockNumber_gte: 12, blockNumber_lte: 34, schemeId: "7", caller: "0x1234567890123456789012345678901234567890", id_lt: $id_lt'
    );
  });

  test('should preserve raw legacy filters when building the where clause', () => {
    expect(
      buildAnnouncementsWhereClause({
        filter: 'someFilter: true',
        cursor: 'cursor-1'
      })
    ).toBe('someFilter: true, id_lt: $id_lt');
  });

  test('should normalize and escape typed filter values', () => {
    expect(
      buildAnnouncementsWhereClause({
        caller: '0xA16081F360e3847006dB660bae1c6d1b2e17eC2A',
        fromBlock: 12,
        schemeId: 1
      })
    ).toBe(
      'blockNumber_gte: 12, schemeId: "1", caller: "0xA16081F360e3847006dB660bae1c6d1b2e17eC2A"'
    );
  });

  test('should reject invalid typed numeric filters', () => {
    expect(() =>
      buildAnnouncementsWhereClause({
        fromBlock: -1
      })
    ).toThrow('fromBlock must be a non-negative integer');
  });

  test('should resolve the snapshot block when omitted and reuse it for the probe', async () => {
    mockRequest
      .mockReturnValueOnce(Promise.resolve(makeSnapshotMetaResponse(123)))
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [
            makeSubgraphEntity('3'),
            makeSubgraphEntity('2'),
            makeSubgraphEntity('1')
          ]
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [makeSubgraphEntity('0')]
        })
      );

    const result = await fetchAnnouncementsPage({
      client: mockClient,
      pageSize: 3
    });

    expect(result).toEqual({
      announcements: [
        makeSubgraphEntity('3'),
        makeSubgraphEntity('2'),
        makeSubgraphEntity('1')
      ],
      nextCursor: '1',
      snapshotBlock: 123n
    });
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('_meta')
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('block: { number: 123 }'),
      { first: 3 }
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('block: { number: 123 }'),
      { first: 1, id_lt: '1' }
    );
  });

  test('should fetch a page with typed filters and return the next cursor for a full page', async () => {
    mockRequest
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [
            makeSubgraphEntity('3'),
            makeSubgraphEntity('2'),
            makeSubgraphEntity('1')
          ]
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [makeSubgraphEntity('0')]
        })
      );

    const result = await fetchAnnouncementsPage({
      caller: '0x1234567890123456789012345678901234567890',
      client: mockClient,
      cursor: '4',
      fromBlock: 100,
      pageSize: 3,
      schemeId: 1n,
      snapshotBlock: 123,
      toBlock: 200
    });

    expect(result).toEqual({
      announcements: [
        makeSubgraphEntity('3'),
        makeSubgraphEntity('2'),
        makeSubgraphEntity('1')
      ],
      nextCursor: '1',
      snapshotBlock: 123n
    });
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('block: { number: 123 }'),
      { first: 3, id_lt: '4' }
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'blockNumber_gte: 100, blockNumber_lte: 200, schemeId: "1", caller: "0x1234567890123456789012345678901234567890", id_lt: $id_lt'
      ),
      { first: 3, id_lt: '4' }
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('block: { number: 123 }'),
      { first: 1, id_lt: '1' }
    );
    expect(mockRequest).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        'blockNumber_gte: 100, blockNumber_lte: 200, schemeId: "1", caller: "0x1234567890123456789012345678901234567890", id_lt: $id_lt'
      ),
      { first: 1, id_lt: '1' }
    );
  });

  test('should omit the next cursor when the terminal page is not full', async () => {
    mockRequest.mockReturnValue(
      Promise.resolve({
        announcements: [makeSubgraphEntity('2'), makeSubgraphEntity('1')]
      })
    );

    const result = await fetchAnnouncementsPage({
      client: mockClient,
      pageSize: 3,
      snapshotBlock: 123
    });

    expect(result).toEqual({
      announcements: [makeSubgraphEntity('2'), makeSubgraphEntity('1')],
      nextCursor: undefined,
      snapshotBlock: 123n
    });
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  test('should omit the next cursor for an exact-multiple terminal page', async () => {
    mockRequest
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [
            makeSubgraphEntity('3'),
            makeSubgraphEntity('2'),
            makeSubgraphEntity('1')
          ]
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: []
        })
      );

    const result = await fetchAnnouncementsPage({
      client: mockClient,
      pageSize: 3,
      snapshotBlock: 123
    });

    expect(result).toEqual({
      announcements: [
        makeSubgraphEntity('3'),
        makeSubgraphEntity('2'),
        makeSubgraphEntity('1')
      ],
      nextCursor: undefined,
      snapshotBlock: 123n
    });
    expect(mockRequest).toHaveBeenNthCalledWith(1, expect.any(String), {
      first: 3
    });
    expect(mockRequest).toHaveBeenNthCalledWith(2, expect.any(String), {
      first: 1,
      id_lt: '1'
    });
  });

  test('should probe one additional record at the maximum supported page size', async () => {
    const fullPage = Array.from(
      { length: MAX_SUBGRAPH_PAGE_SIZE },
      (_, index) =>
        makeSubgraphEntity(makeOrderedId(MAX_SUBGRAPH_PAGE_SIZE - index))
    );

    mockRequest
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: fullPage
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [makeSubgraphEntity(makeOrderedId(0))]
        })
      );

    const result = await fetchAnnouncementsPage({
      client: mockClient,
      pageSize: MAX_SUBGRAPH_PAGE_SIZE,
      snapshotBlock: 123
    });

    expect(result).toEqual({
      announcements: fullPage,
      nextCursor: makeOrderedId(1),
      snapshotBlock: 123n
    });
    expect(mockRequest).toHaveBeenNthCalledWith(1, expect.any(String), {
      first: MAX_SUBGRAPH_PAGE_SIZE
    });
    expect(mockRequest).toHaveBeenNthCalledWith(2, expect.any(String), {
      first: 1,
      id_lt: makeOrderedId(1)
    });
  });

  test('should surface request errors', async () => {
    mockRequest.mockReturnValue(Promise.reject(new Error('GraphQL error')));

    expect(
      fetchAnnouncementsPage({
        client: mockClient,
        pageSize: 3,
        snapshotBlock: 123
      })
    ).rejects.toThrow('GraphQL error');
  });

  test('should reject oversized page sizes', async () => {
    expect(
      fetchAnnouncementsPage({
        client: mockClient,
        pageSize: MAX_SUBGRAPH_PAGE_SIZE + 1
      })
    ).rejects.toThrow(
      `pageSize must be less than or equal to ${MAX_SUBGRAPH_PAGE_SIZE}`
    );
  });

  test('should fetch a legacy batch with page size 1000', async () => {
    const fullBatch = Array.from(
      { length: MAX_LEGACY_SUBGRAPH_PAGE_SIZE },
      (_, index) =>
        makeSubgraphEntity(makeOrderedId(MAX_LEGACY_SUBGRAPH_PAGE_SIZE - index))
    );

    mockRequest.mockReturnValueOnce(
      Promise.resolve({
        announcements: fullBatch
      })
    );

    const result = await fetchAnnouncementsBatch({
      client: mockClient,
      pageSize: MAX_LEGACY_SUBGRAPH_PAGE_SIZE
    });

    expect(result).toEqual({
      announcements: fullBatch,
      nextCursor: makeOrderedId(1)
    });
    expect(mockRequest).toHaveBeenCalledWith(expect.any(String), {
      first: MAX_LEGACY_SUBGRAPH_PAGE_SIZE
    });
  });

  test('should reject oversized legacy batch sizes', async () => {
    expect(
      fetchAnnouncementsBatch({
        client: mockClient,
        pageSize: MAX_LEGACY_SUBGRAPH_PAGE_SIZE + 1
      })
    ).rejects.toThrow(
      `pageSize must be less than or equal to ${MAX_LEGACY_SUBGRAPH_PAGE_SIZE}`
    );
  });

  test('should reject responses that are not in strict descending id order', async () => {
    mockRequest.mockReturnValueOnce(
      Promise.resolve({
        announcements: [makeSubgraphEntity('2'), makeSubgraphEntity('3')]
      })
    );

    expect(
      fetchAnnouncementsPage({
        client: mockClient,
        pageSize: 2,
        snapshotBlock: 123
      })
    ).rejects.toThrow(
      'Subgraph announcements must be returned in strict descending id order'
    );
  });

  test('should reject probe responses that violate the cursor boundary', async () => {
    mockRequest
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [makeSubgraphEntity('3'), makeSubgraphEntity('2')]
        })
      )
      .mockReturnValueOnce(
        Promise.resolve({
          announcements: [makeSubgraphEntity('2')]
        })
      );

    expect(
      fetchAnnouncementsPage({
        client: mockClient,
        pageSize: 2,
        snapshotBlock: 123
      })
    ).rejects.toThrow(
      'Subgraph announcements must be returned in strict descending id order'
    );
  });

  test('paged and legacy helpers should traverse the same filtered dataset across page sizes', async () => {
    const callerA = '0x1234567890123456789012345678901234567890' as const;
    const callerB = '0xA16081F360e3847006dB660bae1c6d1b2e17eC2A' as const;
    const dataset = [
      { ...makeSubgraphEntity('6'), blockNumber: '11', caller: callerA },
      { ...makeSubgraphEntity('5'), blockNumber: '10', caller: callerA },
      { ...makeSubgraphEntity('4'), blockNumber: '10', caller: callerA },
      {
        ...makeSubgraphEntity('3'),
        blockNumber: '9',
        caller: callerB,
        schemeId: '2'
      },
      { ...makeSubgraphEntity('2'), blockNumber: '8', caller: callerA },
      { ...makeSubgraphEntity('1'), blockNumber: '7', caller: callerA }
    ];

    const scenarios = [
      {},
      {
        caller: callerA,
        fromBlock: 8,
        schemeId: 1,
        toBlock: 10
      }
    ];

    for (const scenario of scenarios) {
      for (const pageSize of [1, 2, 3]) {
        const { client } = createDatasetBackedMockClient(dataset);
        const pagedIds: string[] = [];
        let cursor: string | undefined;

        do {
          const page = await fetchAnnouncementsPage({
            client,
            cursor,
            pageSize,
            snapshotBlock: 123,
            ...scenario
          });
          pagedIds.push(...page.announcements.map(entity => entity.id));
          cursor = page.nextCursor;
        } while (cursor);

        const batchIds: string[] = [];
        let batchCursor: string | undefined;

        do {
          const batch = await fetchAnnouncementsBatch({
            client,
            cursor: batchCursor,
            pageSize,
            filter: buildLegacyFilter(scenario)
          });
          batchIds.push(...batch.announcements.map(entity => entity.id));
          batchCursor = batch.nextCursor;
        } while (batchCursor);

        expect(pagedIds).toEqual(batchIds);
      }
    }
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
      metadata: '0xmetadata',
      timestamp: '1234567890'
    };

    const result = convertSubgraphEntityToAnnouncementLog(subgraphEntity);

    expect(result).toEqual({
      address: ERC5564_CONTRACT_ADDRESS,
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
      metadata: '0xmetadata',
      timestamp: BigInt(1234567890)
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
      metadata: '0xmetadata',
      timestamp: '1234567890'
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
      metadata: '0xmetadata',
      timestamp: '1609459200' // Jan 1, 2021 timestamp
    };

    const result = convertSubgraphEntityToAnnouncementLog(subgraphEntity);

    expect(result.blockNumber).toEqual(BigInt('12345678901234567890'));
    expect(result.logIndex).toEqual(255);
    expect(result.transactionIndex).toEqual(65535);
    expect(result.schemeId).toEqual(BigInt('9876543210987654321'));
    expect(result.timestamp).toEqual(BigInt('1609459200'));
  });
});
