import { utils, getPublicKey } from '@noble/secp256k1';
import { bytesToHex } from 'viem';
import type { HexString } from '../crypto/types';

function generateRandomStealthMetaAddress() {
  // Generate random spending and viewing private keys
  const spendingPrivateKey = utils.randomPrivateKey();
  const viewingPrivateKey = utils.randomPrivateKey();

  // Derive the public keys from the private keys
  const spendingPublicKey = bytesToHex(getPublicKey(spendingPrivateKey, true));
  const viewingPublicKey = bytesToHex(getPublicKey(viewingPrivateKey, true));

  // Concatenate the spending and viewing public keys for the meta-address
  const stealthMetaAddress = (spendingPublicKey +
    viewingPublicKey.substring(2)) as HexString;

  const stealthMetaAddressURI = `st:eth:${stealthMetaAddress}`;

  return {
    spendingPrivateKey: bytesToHex(spendingPrivateKey),
    spendingPublicKey,
    stealthMetaAddress,
    stealthMetaAddressURI,
    viewingPrivateKey: bytesToHex(viewingPrivateKey),
    viewingPublicKey,
  };
}

export default generateRandomStealthMetaAddress;
