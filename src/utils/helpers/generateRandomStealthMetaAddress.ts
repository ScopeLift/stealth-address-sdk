import { utils, getPublicKey } from '@noble/secp256k1';
import { bytesToHex } from 'viem';

function generateRandomStealthMetaAddress(chain = 'eth') {
  if (chain !== 'eth') {
    throw new Error('Invalid chain ref');
  }

  // Generate random spending and viewing private keys
  const spendingPrivateKey = utils.randomPrivateKey();
  const viewingPrivateKey = utils.randomPrivateKey();

  // Derive the public keys from the private keys
  const spendingPublicKey = bytesToHex(getPublicKey(spendingPrivateKey, true));
  const viewingPublicKey = bytesToHex(getPublicKey(viewingPrivateKey, true));

  // Concatenate the spending and viewing public keys for the meta-address
  const stealthMetaAddress = spendingPublicKey + viewingPublicKey.substring(2);

  const stealthMetaAddressURI = `st:${chain}:${stealthMetaAddress}`;

  return {
    stealthMetaAddressURI,
    spendingPublicKey,
    spendingPrivateKey: bytesToHex(spendingPrivateKey),
    viewingPublicKey,
    viewingPrivateKey: bytesToHex(viewingPrivateKey),
  };
}

export default generateRandomStealthMetaAddress;
