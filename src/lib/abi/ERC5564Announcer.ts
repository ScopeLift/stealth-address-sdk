export default [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'schemeId',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'stealthAddress',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'caller',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'ephemeralPubKey',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'metadata',
        type: 'bytes',
      },
    ],
    name: 'Announcement',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'schemeId', type: 'uint256' },
      { internalType: 'address', name: 'stealthAddress', type: 'address' },
      { internalType: 'bytes', name: 'ephemeralPubKey', type: 'bytes' },
      { internalType: 'bytes', name: 'metadata', type: 'bytes' },
    ],
    name: 'announce',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
