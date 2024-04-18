import { beforeAll, describe, expect, test } from 'bun:test';
import { signMessage } from 'viem/actions';
import setupTestWallet from '../../../lib/helpers/test/setupTestWallet';
import type { SuperWalletClient } from '../../../lib/helpers/types';
import { VALID_SCHEME_ID, parseKeysFromStealthMetaAddress } from '../../crypto';
import type { HexString } from '../../crypto/types';
import getStealthMetaAddressFromSignature from '../getStealthMetaAddressFromSignature';

describe('getStealthMetaAddressFromSignature', () => {
  let walletClient: SuperWalletClient;
  let signature: HexString;

  beforeAll(async () => {
    walletClient = await setupTestWallet();
    if (!walletClient.account) throw new Error('No account found');

    // Generate a signature to use in the tests
    signature = await signMessage(walletClient, {
      account: walletClient.account,
      message:
        'Sign this message to generate your stealth address keys.\nChain ID: 31337'
    });
  });

  test('should generate a stealth meta-address from a signature', () => {
    const result = getStealthMetaAddressFromSignature(signature);

    expect(result).toBeTruthy();

    // Can parse the keys from the stealth meta-address
    expect(() =>
      parseKeysFromStealthMetaAddress({
        stealthMetaAddress: result,
        schemeId: VALID_SCHEME_ID.SCHEME_ID_1
      })
    ).not.toThrow();
  });
});
