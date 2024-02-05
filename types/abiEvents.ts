export const announcementEvent = {
  type: "event",
  name: "Announcement",
  inputs: [
    {
      indexed: true,
      name: "schemeId",
      type: "uint256",
    },
    {
      indexed: true,
      name: "stealthAddress",
      type: "address",
    },
    {
      indexed: true,
      name: "caller",
      type: "address",
    },
    {
      indexed: false,
      name: "ephemeralPubKey",
      type: "bytes",
    },
    {
      indexed: false,
      name: "metadata",
      type: "bytes",
    },
  ],
} as const;

export type BlockType =
  | bigint
  | "latest"
  | "earliest"
  | "pending"
  | "safe"
  | "finalized";
