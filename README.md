# Stealth Address SDK

This TypeScript SDK provides tools for working with Ethereum stealth addresses as defined in [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564) and [EIP-6538](https://eips.ethereum.org/EIPS/eip-6538). It aims to offer a comprehensive suite of functionalities for both generating stealth addresses and interacting with stealth transactions.

## Documentation

For comprehensive documentation and to learn more about stealth addresses, please visit our [official documentation site](https://stealthaddress.dev/).

## Contract Deployments

Information about contract deployments can be found on the [deployments page](https://stealthaddress.dev/contracts/deployments) of our official documentation site.

## Features

- Generate Ethereum stealth addresses.
- Compute stealth address private keys.
- Check stealth address announcements to determine if they are intended for a specific user.
- Look up the stealth meta address for a registrant
- Fetch announcements
- Watch announcements for a user
- Prepare the payload for announcing stealth address details
- Prepare the payload for registering a stealth meta-address on someone's behalf

## Installation

```bash
npm install @scopelift/stealth-address-sdk
# or
yarn add @scopelift/stealth-address-sdk
# or
bun install @scopelift/stealth-address-sdk
```

## Testing

Tests default to using your local [anvil](https://book.getfoundry.sh/anvil/) node

```bash
anvil
bun run test
```

Alternatively, run your tests using a fork of your provided (`RPC_URL` in `env`) rpc url

```bash
bun run anvil-fork
# run all tests
bun run test-fork
# or for a specific file
bun run test-fork FILE={file path}
```

## Quick Start

### Generating a Stealth Address

```ts
import { generateStealthAddress } from "@scopelift/stealth-address-sdk";

// Your stealth meta-address URI
// Follows the format: "st:<chain>:<stealthMetaAddress>", where <chain> is the chain identifier (https://eips.ethereum.org/EIPS/eip-3770#examples) and <stealthMetaAddress> is the stealth meta-address.
const stealthMetaAddressURI = "...";

// Generate a stealth address using the default scheme (1)
// To learn more about the initial implementation scheme using SECP256k1, please see the reference here (https://eips.ethereum.org/EIPS/eip-5564)
const result = generateStealthAddress({ stealthMetaAddressURI });

// Use the stealth address
console.log(result.stealthAddress);
```

### Computing Stealth Key

```ts
import {
  computeStealthKey,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";

// Example inputs
const viewingPrivateKey = "0x..."; // Viewing private key of the recipient
const spendingPrivateKey = "0x..."; // Spending private key of the recipient
const ephemeralPublicKey = "0x..."; // Ephemeral public key from the sender's announcement
const schemeId = VALID_SCHEME_ID.SCHEME_ID_1; // Scheme ID, currently only '1' is supported

// Compute the stealth private key
const stealthPrivateKey = computeStealthKey({
  viewingPrivateKey,
  spendingPrivateKey,
  ephemeralPublicKey,
  schemeId,
});
```

### Checking Stealth Address Announcements

```ts
import {
  checkStealthAddress,
  VALID_SCHEME_ID,
} from "@scopelift/stealth-address-sdk";

// Example inputs
const ephemeralPublicKey = "0x..."; // The ephemeral public key from the announcement
const spendingPublicKey = "0x..."; // The user's spending public key
const userStealthAddress = "0x..."; // The user's stealth address
const viewingPrivateKey = "0x..."; // The user's viewing private key
const viewTag = "0x..."; // The view tag from the announcement
const schemeId = VALID_SCHEME_ID.SCHEME_ID_1; // Scheme ID, currently only '1' is supported

// Check if the announcement is intended for the user
const isForUser = checkStealthAddress({
  ephemeralPublicKey,
  schemeId,
  spendingPublicKey,
  userStealthAddress,
  viewingPrivateKey,
  viewTag,
});

console.log(
  isForUser
    ? "Announcement is for the user"
    : "Announcement is not for the user"
);
```

### Fetching announcements, and checking if the associated stealth address is for the user

```ts
import {
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  createStealthClient,
} from "@scopelift/stealth-address-sdk";

// Example parameters
const chainId = 11155111; // Example chain ID for Sepolia
const rpcUrl = process.env.RPC_URL; // Your env rpc url that aligns with the chainId;
const fromBlock = BigInt(12345678); // Example ERC5564 announcer contract deploy block for Sepolia, or the block in which the user registered their stealth meta address (as an example)

// Initialize the stealth client
const stealthClient = createStealthClient({ chainId, rpcUrl: rpcUrl! });

// Use the address of your calling contract if applicable
const caller = "0xYourCallingContractAddress";

// Your scheme id
const schemeId = BigInt(VALID_SCHEME_ID.SCHEME_ID_1);

// The contract address of the ERC5564Announcer on your target blockchain
// You can use the provided ERC5564_CONTRACT_ADDRESS get the singleton contract address for a valid chain ID
const ERC5564Address = ERC5564_CONTRACT_ADDRESS;

async function fetchAnnouncementsForUser() {
  // Example call to getAnnouncements action on the stealth client to get all potential announcements
  // Use your preferred method to get announcements if different, and
  // adjust parameters according to your requirements
  const announcements = await stealthClient.getAnnouncements({
    ERC5564Address,
    args: {
      schemeId,
      caller,
      // Additional args for filtering, if necessary
    },
    fromBlock, // Optional fromBlock parameter (defaults to 0, which can be slow for many blocks)
  });

  // Example call to getAnnouncementsForUser action on the stealth client
  // Adjust parameters according to your requirements
  const userAnnouncements = await stealthClient.getAnnouncementsForUser({
    announcements,
    spendingPublicKey: "0xUserSpendingPublicKey",
    viewingPrivateKey: "0xUserViewingPrivateKey",
  });

  return userAnnouncements;
}
```

### Fetching announcements from a subgraph

Use `getAnnouncementsPageUsingSubgraph` when you want deterministic cursor-based
pagination without building raw filter strings yourself.

```ts
import { getAnnouncementsPageUsingSubgraph } from "@scopelift/stealth-address-sdk";

const firstPage = await getAnnouncementsPageUsingSubgraph({
  subgraphUrl: "https://your-subgraph.example/api",
});

console.log(firstPage.announcements);
console.log(firstPage.nextCursor); // present only when another page exists
console.log(firstPage.snapshotBlock); // required for every later page in the same scan
```

Scan filters are optional on the initial page.

- `pageSize` defaults to `999`
- `pageSize` must be between `1` and `999`
- omitting `fromBlock`, `toBlock`, `schemeId`, and `caller` means no filter
- the initial page must omit both `cursor` and `snapshotBlock`
- the SDK resolves `snapshotBlock` on the initial page and returns it
- every subsequent page must provide both `cursor` and `snapshotBlock`

```ts
import { getAnnouncementsPageUsingSubgraph } from "@scopelift/stealth-address-sdk";

const firstPage = await getAnnouncementsPageUsingSubgraph({
  subgraphUrl: "https://your-subgraph.example/api",
  fromBlock: 12345678,
  toBlock: 12349999,
  schemeId: 1n,
  caller: "0x1234567890123456789012345678901234567890",
  pageSize: 100,
});

for (const announcement of firstPage.announcements) {
  console.log(announcement.transactionHash);
}

let cursor = firstPage.nextCursor;

while (cursor) {
  const page = await getAnnouncementsPageUsingSubgraph({
    subgraphUrl: "https://your-subgraph.example/api",
    fromBlock: 12345678,
    toBlock: 12349999,
    schemeId: 1n,
    caller: "0x1234567890123456789012345678901234567890",
    pageSize: 100,
    cursor,
    snapshotBlock: firstPage.snapshotBlock,
  });

  for (const announcement of page.announcements) {
    console.log(announcement.transactionHash);
  }

  cursor = page.nextCursor;
}
```

Pass the previous page's `nextCursor` and the initial page's `snapshotBlock`
back into the same bounded query to fetch the next older page deterministically.
If `nextCursor` is undefined, you are on the terminal page and no extra probe
request is needed.

`cursor` is pagination position. `snapshotBlock` is consistency. Reuse the same
`snapshotBlock` for every page in a multi-page scan so each request reads the
same frozen subgraph view.

Pagination is ordered by subgraph announcement `id` in descending order. The
cursor is the last returned `id`, reused as an exclusive `id_lt` boundary for
the next page, and page queries are pinned to one subgraph block snapshot.

`getAnnouncementsUsingSubgraph` remains available as the legacy eager helper.
It preserves the historical `pageSize` behavior for compatibility, while
`getAnnouncementsPageUsingSubgraph` is the typed cursor-based API.

### Streaming announcements for a user from a subgraph

Use `scanAnnouncementsForUserUsingSubgraph` when you want to fetch one bounded
page at a time, scan it locally for a user, and surface matches incrementally.

```ts
import { scanAnnouncementsForUserUsingSubgraph } from "@scopelift/stealth-address-sdk";

for await (const batch of scanAnnouncementsForUserUsingSubgraph({
  subgraphUrl: "https://your-subgraph.example/api",
  fromBlock: 12345678,
  toBlock: 12349999,
  spendingPublicKey: "0xUserSpendingPublicKey",
  viewingPrivateKey: "0xUserViewingPrivateKey",
})) {
  console.log(batch.announcements);
}
```

Batches are sorted newest to oldest within each scanned page. The overall
stream follows subgraph cursor order, so consumers that need a single global
ordering should re-sort after accumulation.

Each yielded batch includes:

- `announcements`: the matches found in that scanned page
- `scannedCount`: the number of candidate announcements scanned in that page
- `nextCursor`: the resume token for the next older page, when another page exists
- `snapshotBlock`: the fixed subgraph snapshot block for the full bounded scan

Persist `nextCursor` and `snapshotBlock` from any yielded batch if you want to
resume the scan later from the next older page.

If you use `includeList` or `excludeList`, provide `clientParams` or call the
helper through `createStealthClient(...)` so the SDK can resolve transaction
senders for those filters.

Historical scan work is pinned to one `snapshotBlock`. Complete the historical
scan against that fixed snapshot before you start live watching.

### Watching live announcements for a user

Use `watchAnnouncementsForUser` when you want to process live announcement
batches after historical catch-up is complete.

```ts
import {
  ERC5564_CONTRACT_ADDRESS,
  VALID_SCHEME_ID,
  createStealthClient,
} from "@scopelift/stealth-address-sdk";

const stealthClient = createStealthClient({
  chainId: 11155111,
  rpcUrl: process.env.RPC_URL!,
});

const snapshotBlock = 12349999n;

const unwatch = await stealthClient.watchAnnouncementsForUser({
  ERC5564Address: ERC5564_CONTRACT_ADDRESS,
  args: {
    schemeId: BigInt(VALID_SCHEME_ID.SCHEME_ID_1),
    caller: "0xYourCallingContractAddress",
  },
  fromBlock: snapshotBlock + 1n,
  spendingPublicKey: "0xUserSpendingPublicKey",
  viewingPrivateKey: "0xUserViewingPrivateKey",
  handleLogsForUser: async (logs, meta) => {
    console.log("live matches", logs, meta);
  },
  onHeartbeat: meta => {
    console.log("watch heartbeat", meta.observedBlock.toString());
  },
  onError: error => {
    console.error("watch handler failed", error);
  },
});
```

`handleLogsForUser` receives a second `meta` argument with:

- `fromBlock`
- `observedBlock`
- `pollTimestamp`
- `rawLogCount`
- `relevantLogCount`

If you also provide `onHeartbeat`, the SDK calls it whenever the watcher
observes a chain head while polling. That lets the app distinguish "watch is
alive but there were no matching logs" from "watch appears stalled" without
adding a separate head-polling loop.

The SDK ignores `handleLogsForUser`'s return value, but it awaits any returned
promise before considering that batch processed. Watched batches are processed
one at a time in arrival order. If one batch takes a long time to finish, later
batches wait behind it.

If watched batch processing fails:

- the SDK reports that failure once through `onError` when provided
- if `onError` is omitted, the SDK logs the error to `console.error`
- the watcher stays alive for later batches
- the failed batch is not replayed automatically
- if `onError` also throws, that secondary failure is swallowed so the watcher
  can continue
- if both `onError` and fallback logging fail, that reporting failure is
  swallowed as a last resort so the watcher can continue processing later
  batches

Calling `unwatch()` stops future watched batches, but it does not cancel a batch
that is already in flight.

### Recommended scan -> watch handoff

The clean no-gap/no-dup handoff is:

1. Fetch historical pages with `getAnnouncementsPageUsingSubgraph(...)` or
   stream them with `scanAnnouncementsForUserUsingSubgraph(...)`.
2. Reuse the first page's `snapshotBlock` for every later historical page in
   that catch-up sequence.
3. Persist and dedupe the historical matches locally.
4. Only after historical catch-up completes, start
   `watchAnnouncementsForUser(...)` at `fromBlock: snapshotBlock + 1n`.

That boundary keeps historical reads pinned to one frozen subgraph view and
starts live watching strictly after that snapshot, so the normal path avoids
gaps and avoids duplicate delivery.

See the runnable React/TanStack composition example in
`examples/composeAnnouncementHistoryAndWatch`.

## License

[MIT](/LICENSE) License
