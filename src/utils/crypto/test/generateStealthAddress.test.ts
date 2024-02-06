import { bytesToHex, getAddress } from "viem";
import {
  generateStealthAddress,
  getViewTag,
  parseKeysFromStealthMetaAddress,
} from "..";
import { VALID_SCHEME_ID, type HexString } from "../types";

describe("generateStealthAddress", () => {
  const validStealthMetaAddressURI =
    "st:eth:0x02415529b5a96fc810b24d1c754dade2e2af1d8123953cca79699b845d371df11a02137217931b4abbdd24476879a6799ee30053248bff0c12a799362bbf2d23d1c5";
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const expectedStealthAddress = getAddress(
    "0x2909d531ddeb89f4f7e594c85d706973fd524347"
  );

  // Example data:
  // Stealth Address: 0x2909d531ddeb89f4f7e594c85d706973fd524347
  // Announcement (ephemeral public key): 0x03111059b8af63d5fc93d4a0cbd2eeb5f06e30a0d2395ff991458295bf37003ceb
  // Metadata: 0xd9
  // Spending Public Key: 0x02415529b5a96fc810b24d1c754dade2e2af1d8123953cca79699b845d371df11a
  // Viewing Public Key: 0x02137217931b4abbdd24476879a6799ee30053248bff0c12a799362bbf2d23d1c5
  test("should generate a valid stealth address given a valid stealth meta-address URI", async () => {
    const result = generateStealthAddress({
      stealthMetaAddressURI: validStealthMetaAddressURI,
      schemeId,
    });

    expect(result.stealthAddress).toBe(getAddress(expectedStealthAddress));
  });

  test("should correctly parse spending and viewing public keys from valid stealth meta-address", () => {
    const stealthMetaAddress = validStealthMetaAddressURI.slice(7) as HexString;
    const expectedSpendingPublicKeyHex =
      "0x02415529b5a96fc810b24d1c754dade2e2af1d8123953cca79699b845d371df11a";
    const expectedViewingPublicKeyHex =
      "0x02137217931b4abbdd24476879a6799ee30053248bff0c12a799362bbf2d23d1c5";

    const result = parseKeysFromStealthMetaAddress({
      stealthMetaAddress,
      schemeId,
    });

    expect(bytesToHex(result.spendingPublicKey)).toBe(
      expectedSpendingPublicKeyHex
    );
    expect(bytesToHex(result.viewingPublicKey)).toBe(
      expectedViewingPublicKeyHex
    );
  });

  test("should correctly extract the view tag from the hashed shared secret", () => {
    // Replace with the hashed shared secret from which you expect to extract the view tag
    const hashedSharedSecret =
      "0x158ce29a3dd0c8dca524e5776c2ba6361c280e013f87eee5eb799a713a939501";
    const expectedViewTag = "0x15";

    const result = getViewTag({
      hashedSharedSecret,
      schemeId,
    });

    expect(result).toBe(expectedViewTag);
  });
});
