import { beforeAll, describe, test, expect } from "bun:test";
import setupTestEnv from "../../helpers/test/setupTestEnv";
import setupTestWallet from "../../helpers/test/setupTestWallet";
import { VALID_SCHEME_ID, generateStealthAddress } from "../../..";
import setupTestStealthKeys from "../../helpers/test/setupTestStealthKeys";
import { PrepareError } from "../types";
import type { StealthActions } from "../../stealthClient/types";
import type { Address, Chain, TransactionReceipt } from "viem";
import type { SuperWalletClient } from "../../helpers/types";

describe("prepareAnnounce", () => {
  let stealthClient: StealthActions,
    ERC5564Address: Address,
    walletClient: SuperWalletClient,
    account: Address,
    chain: Chain;

  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const { stealthMetaAddressURI } = setupTestStealthKeys(schemeId);
  const { stealthAddress, ephemeralPublicKey, viewTag } =
    generateStealthAddress({
      stealthMetaAddressURI,
      schemeId,
    });

  const prepareArgs = {
    schemeId,
    stealthAddress,
    ephemeralPublicKey,
    metadata: viewTag,
  };

  // Transaction receipt for writing to the contract with the prepared payload
  let res: TransactionReceipt;

  beforeAll(async () => {
    // Set up the test environment
    ({ stealthClient, ERC5564Address } = await setupTestEnv());
    walletClient = await setupTestWallet();
    account = walletClient.account?.address!;
    chain = walletClient.chain!;

    const prepared = await stealthClient.prepareAnnounce({
      account,
      args: prepareArgs,
      ERC5564Address,
    });

    // Prepare tx using viem and the prepared payload
    const request = await walletClient.prepareTransactionRequest({
      ...prepared,
      chain,
      account,
    });

    const hash = await walletClient.sendTransaction({
      ...request,
      chain,
      account,
    });

    res = await walletClient.waitForTransactionReceipt({ hash });
  });

  test("should throw PrepareError when given invalid params", () => {
    const invalidERC5564Address = "0xinvalid";
    expect(
      stealthClient.prepareAnnounce({
        account,
        args: prepareArgs,
        ERC5564Address: invalidERC5564Address,
      })
    ).rejects.toBeInstanceOf(PrepareError);
  });

  test("should successfully announce the stealth address details using the prepare payload", () => {
    expect(res.status).toEqual("success");
  });
});
