import { utils } from "noble-secp256k1";
import { bytesToBigInt } from "viem";

const BYTES_SIZE = 32;

export const genRandomNumber = () => {
  const randomNumberAsBytes = utils.randomPrivateKey();
  return bytesToBigInt(randomNumberAsBytes, { size: BYTES_SIZE });
};
