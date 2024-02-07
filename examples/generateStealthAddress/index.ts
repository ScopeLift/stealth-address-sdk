import { generateStealthAddress } from 'stealth-address-sdk';

const stealthMetaAddressURI = 'your_stealth_meta_address_here';
const result = await generateStealthAddress({ stealthMetaAddressURI });

export default result;
