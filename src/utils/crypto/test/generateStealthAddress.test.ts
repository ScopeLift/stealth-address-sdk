import { getAddress } from "viem";
import { generateStealthAddress } from "..";
import { VALID_SCHEME_ID } from "../types";

describe("generateStealthAddress", () => {
  const validStealthMetaAddressURI =
    "st:eth:0x02415529b5a96fc810b24d1c754dade2e2af1d8123953cca79699b845d371df11a02137217931b4abbdd24476879a6799ee30053248bff0c12a799362bbf2d23d1c5";
  const schemeId = VALID_SCHEME_ID.SCHEME_ID_1;
  const expectedStealthAddress = getAddress(
    "0x2909d531ddeb89f4f7e594c85d706973fd524347"
  );

  // Example data:
  // Stealth Address: 0x2909d531ddeb89f4f7e594c85d706973fd524347
  // Announcement: 0x03111059b8af63d5fc93d4a0cbd2eeb5f06e30a0d2395ff991458295bf37003ceb
  // Metadata: 0xd9
  // Spending Public Key: 0x02415529b5a96fc810b24d1c754dade2e2af1d8123953cca79699b845d371df11a
  // Viewing Public Key: 0x02137217931b4abbdd24476879a6799ee30053248bff0c12a799362bbf2d23d1c5
  test("should generate a valid stealth address given a valid stealth meta-address URI", async () => {
    const result = generateStealthAddress({
      stealthMetaAddressURI: validStealthMetaAddressURI,
      schemeId,
    });

    expect(result).toBeDefined();
    expect(result.stealthAddress).toBe(getAddress(expectedStealthAddress));
  });
});
