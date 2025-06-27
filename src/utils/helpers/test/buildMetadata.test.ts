import { describe, expect, test } from 'bun:test';
import { parseUnits } from 'viem';
import {
  ERC20_FUNCTION_SELECTORS,
  ERC721_FUNCTION_SELECTORS,
  buildMetadataCustom,
  buildMetadataForERC20,
  buildMetadataForERC721,
  buildMetadataForETH,
  parseMetadata
} from '../buildMetadata.js';

const MOCK_VIEW_TAG = '0x99' as const;
const MOCK_TOKEN_ADDRESS =
  '0xA0b86a33E6441E6837FD5E163Aa01879cBbD5bbD' as const;
const MOCK_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

describe('buildMetadata', () => {
  describe('buildMetadataForETH', () => {
    test('should build correct metadata for ETH transfer', () => {
      const amount = parseUnits('1.5', 18); // 1.5 ETH
      const metadata = buildMetadataForETH({
        viewTag: MOCK_VIEW_TAG,
        amount
      });

      expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/); // 57 bytes = 114 hex chars
      expect(metadata.slice(0, 4)).toBe(MOCK_VIEW_TAG); // First byte is view tag
      expect(metadata.slice(4, 12)).toBe('eeeeeeee'); // ETH identifier
      expect(metadata.slice(12, 52).toLowerCase()).toBe(
        MOCK_ETH_ADDRESS.slice(2).toLowerCase()
      ); // ETH address
    });

    test('should handle different ETH amounts', () => {
      const testCases = [
        { amount: '0', description: 'zero ETH' },
        { amount: parseUnits('0.001', 18), description: 'small amount' },
        { amount: parseUnits('1000', 18), description: 'large amount' },
        {
          amount: BigInt('999999999999999999999999'),
          description: 'very large amount'
        }
      ];

      for (const { amount } of testCases) {
        const metadata = buildMetadataForETH({
          viewTag: MOCK_VIEW_TAG,
          amount
        });

        expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
        expect(metadata.slice(0, 4)).toBe(MOCK_VIEW_TAG);

        // Verify round-trip parsing
        const parsed = parseMetadata(metadata);
        expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
        expect(parsed.functionIdentifier).toBe('0xeeeeeeee');
        expect(parsed.contractAddress.toLowerCase()).toBe(
          MOCK_ETH_ADDRESS.toLowerCase()
        );
      }
    });
  });

  describe('buildMetadataForERC20', () => {
    test('should build correct metadata for ERC20 transfer with default function selector', () => {
      const amount = parseUnits('100', 18); // 100 tokens
      const metadata = buildMetadataForERC20({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        amount
      });

      expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
      expect(metadata.slice(0, 4)).toBe(MOCK_VIEW_TAG);
      expect(metadata.slice(4, 12)).toBe(
        ERC20_FUNCTION_SELECTORS.TRANSFER.slice(2)
      );
      expect(metadata.slice(12, 52).toLowerCase()).toBe(
        MOCK_TOKEN_ADDRESS.slice(2).toLowerCase()
      );
    });

    test('should build correct metadata for ERC20 with custom function selector', () => {
      const amount = parseUnits('50', 6); // 50 USDC (6 decimals)
      const metadata = buildMetadataForERC20({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        amount,
        functionSelector: ERC20_FUNCTION_SELECTORS.TRANSFER_FROM
      });

      expect(metadata.slice(4, 12)).toBe(
        ERC20_FUNCTION_SELECTORS.TRANSFER_FROM.slice(2)
      );

      const parsed = parseMetadata(metadata);
      expect(parsed.functionIdentifier).toBe(
        ERC20_FUNCTION_SELECTORS.TRANSFER_FROM
      );
    });

    test('should handle different token amounts', () => {
      const testCases = [
        { amount: 0, description: 'zero tokens' },
        { amount: 1, description: 'single token' },
        { amount: parseUnits('0.000001', 18), description: 'tiny amount' },
        { amount: parseUnits('1000000', 18), description: 'large amount' }
      ];

      for (const { amount } of testCases) {
        const metadata = buildMetadataForERC20({
          viewTag: MOCK_VIEW_TAG,
          tokenAddress: MOCK_TOKEN_ADDRESS,
          amount
        });

        expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
        const parsed = parseMetadata(metadata);
        expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
        expect(parsed.contractAddress.toLowerCase()).toBe(
          MOCK_TOKEN_ADDRESS.toLowerCase()
        );
      }
    });
  });

  describe('buildMetadataForERC721', () => {
    test('should build correct metadata for ERC721 transfer with default function selector', () => {
      const tokenId = 12345;
      const metadata = buildMetadataForERC721({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        tokenId
      });

      expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
      expect(metadata.slice(0, 4)).toBe(MOCK_VIEW_TAG);
      expect(metadata.slice(4, 12)).toBe(
        ERC721_FUNCTION_SELECTORS.TRANSFER_FROM.slice(2)
      );
      expect(metadata.slice(12, 52).toLowerCase()).toBe(
        MOCK_TOKEN_ADDRESS.slice(2).toLowerCase()
      );
    });

    test('should build correct metadata for ERC721 with custom function selector', () => {
      const tokenId = BigInt('999999999999999999999');
      const metadata = buildMetadataForERC721({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        tokenId,
        functionSelector: ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM
      });

      expect(metadata.slice(4, 12)).toBe(
        ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM.slice(2)
      );

      const parsed = parseMetadata(metadata);
      expect(parsed.functionIdentifier).toBe(
        ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM
      );
    });

    test('should handle different token IDs', () => {
      const testCases = [
        { tokenId: 0, description: 'token ID 0' },
        { tokenId: 1, description: 'token ID 1' },
        { tokenId: 999999, description: 'large token ID' },
        {
          tokenId: BigInt('18446744073709551615'),
          description: 'max uint64 token ID'
        }
      ];

      for (const { tokenId } of testCases) {
        const metadata = buildMetadataForERC721({
          viewTag: MOCK_VIEW_TAG,
          tokenAddress: MOCK_TOKEN_ADDRESS,
          tokenId
        });

        expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
        const parsed = parseMetadata(metadata);
        expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
        expect(parsed.contractAddress.toLowerCase()).toBe(
          MOCK_TOKEN_ADDRESS.toLowerCase()
        );
      }
    });
  });

  describe('buildMetadataCustom', () => {
    test('should build correct metadata for custom contract interaction', () => {
      const customSelector = '0x12345678';
      const customData = BigInt('0xdeadbeef');

      const metadata = buildMetadataCustom({
        viewTag: MOCK_VIEW_TAG,
        functionSelector: customSelector,
        contractAddress: MOCK_TOKEN_ADDRESS,
        data: customData
      });

      expect(metadata).toMatch(/^0x[0-9a-fA-F]{114}$/);
      expect(metadata.slice(0, 4)).toBe(MOCK_VIEW_TAG);
      expect(metadata.slice(4, 12)).toBe(customSelector.slice(2));
      expect(metadata.slice(12, 52).toLowerCase()).toBe(
        MOCK_TOKEN_ADDRESS.slice(2).toLowerCase()
      );

      const parsed = parseMetadata(metadata);
      expect(parsed.functionIdentifier).toBe(customSelector);
    });
  });

  describe('parseMetadata', () => {
    test('should correctly parse ETH metadata', () => {
      const amount = parseUnits('2.5', 18);
      const metadata = buildMetadataForETH({
        viewTag: MOCK_VIEW_TAG,
        amount
      });

      const parsed = parseMetadata(metadata);

      expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
      expect(parsed.functionIdentifier).toBe('0xeeeeeeee');
      expect(parsed.contractAddress.toLowerCase()).toBe(
        MOCK_ETH_ADDRESS.toLowerCase()
      );
      expect(BigInt(parsed.amount)).toBe(amount);
    });

    test('should correctly parse ERC20 metadata', () => {
      const amount = parseUnits('1000', 18);
      const metadata = buildMetadataForERC20({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        amount,
        functionSelector: ERC20_FUNCTION_SELECTORS.TRANSFER_FROM
      });

      const parsed = parseMetadata(metadata);

      expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
      expect(parsed.functionIdentifier).toBe(
        ERC20_FUNCTION_SELECTORS.TRANSFER_FROM
      );
      expect(parsed.contractAddress.toLowerCase()).toBe(
        MOCK_TOKEN_ADDRESS.toLowerCase()
      );
      expect(BigInt(parsed.amount)).toBe(amount);
    });

    test('should correctly parse ERC721 metadata', () => {
      const tokenId = BigInt(42);
      const metadata = buildMetadataForERC721({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        tokenId,
        functionSelector: ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM_WITH_DATA
      });

      const parsed = parseMetadata(metadata);

      expect(parsed.viewTag).toBe(MOCK_VIEW_TAG);
      expect(parsed.functionIdentifier).toBe(
        ERC721_FUNCTION_SELECTORS.SAFE_TRANSFER_FROM_WITH_DATA
      );
      expect(parsed.contractAddress.toLowerCase()).toBe(
        MOCK_TOKEN_ADDRESS.toLowerCase()
      );
      expect(BigInt(parsed.amount)).toBe(tokenId);
    });
  });

  describe('error handling', () => {
    test('should throw error for invalid view tag', () => {
      expect(() => {
        buildMetadataForETH({
          viewTag: '0x999' as unknown as `0x${string}`, // Too long
          amount: 100
        });
      }).toThrow('View tag must be exactly 1 byte');

      expect(() => {
        buildMetadataForETH({
          viewTag: '0x' as unknown as `0x${string}`, // Too short
          amount: 100
        });
      }).toThrow('View tag must be exactly 1 byte');

      expect(() => {
        buildMetadataForETH({
          viewTag: '99' as unknown as `0x${string}`, // Missing 0x prefix
          amount: 100
        });
      }).toThrow('View tag must be exactly 1 byte');
    });

    test('should throw error for invalid function selector', () => {
      expect(() => {
        buildMetadataForERC20({
          viewTag: MOCK_VIEW_TAG,
          tokenAddress: MOCK_TOKEN_ADDRESS,
          amount: 100,
          functionSelector: '0x12345' as unknown as `0x${string}` // Too short
        });
      }).toThrow('Function selector must be exactly 4 bytes');

      expect(() => {
        buildMetadataForERC20({
          viewTag: MOCK_VIEW_TAG,
          tokenAddress: MOCK_TOKEN_ADDRESS,
          amount: 100,
          functionSelector: '0x123456789' as unknown as `0x${string}` // Too long
        });
      }).toThrow('Function selector must be exactly 4 bytes');
    });

    test('should throw error for invalid metadata format in parseMetadata', () => {
      expect(() => {
        parseMetadata('0x12345' as unknown as `0x${string}`); // Too short
      }).toThrow('Invalid metadata length: expected 116 characters');

      expect(() => {
        parseMetadata(
          '12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678' as unknown as `0x${string}`
        ); // Missing 0x
      }).toThrow('Metadata must start with 0x prefix');

      expect(() => {
        parseMetadata(
          '0x99GGGG59cbb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' as unknown as `0x${string}`
        ); // Invalid hex characters (exactly 116 chars)
      }).toThrow('Metadata contains invalid hex characters');
    });
  });

  describe('integration with existing SDK', () => {
    test('should be compatible with getViewTagFromMetadata', async () => {
      // Import the existing helper (it's a default export)
      const { default: getViewTagFromMetadata } = await import(
        '../getViewTagFromMetadata.js'
      );

      const metadata = buildMetadataForERC20({
        viewTag: MOCK_VIEW_TAG,
        tokenAddress: MOCK_TOKEN_ADDRESS,
        amount: parseUnits('100', 18)
      });

      const extractedViewTag = getViewTagFromMetadata(metadata);
      expect(extractedViewTag).toBe(MOCK_VIEW_TAG);
    });
  });
});
