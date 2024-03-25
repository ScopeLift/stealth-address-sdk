const ERC5564_BYTECODE =
  '0x608060405234801561001057600080fd5b506102c5806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80634d1f958314610030575b600080fd5b61004361003e36600461018d565b610045565b005b3373ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff16857f5f0eab8057630ba7676c49b4f21a0231414e79474595be8e4c432fbf6bf0f4e785856040516100a592919061028a565b60405180910390a450505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b600082601f8301126100f357600080fd5b813567ffffffffffffffff8082111561010e5761010e6100b3565b604051601f83017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f01168101908282118183101715610154576101546100b3565b8160405283815286602085880101111561016d57600080fd5b836020870160208301376000602085830101528094505050505092915050565b600080600080608085870312156101a357600080fd5b84359350602085013573ffffffffffffffffffffffffffffffffffffffff811681146101ce57600080fd5b9250604085013567ffffffffffffffff808211156101eb57600080fd5b6101f7888389016100e2565b9350606087013591508082111561020d57600080fd5b5061021a878288016100e2565b91505092959194509250565b6000815180845260005b8181101561024c57602081850181015186830182015201610230565b5060006020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b60408152600061029d6040830185610226565b82810360208401526102af8185610226565b9594505050505056fea164736f6c6343000817000a';
const ERC6538_BYTECODE =
  '0x60c060405234801561001057600080fd5b50466080526100bd604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f6124ff9f656d31cbb8918f3698282fe3b3527cc4dede357f0fbf535d197bbb7f918101919091527fe6bbd6277e1bf288eed5e8d1780f9a50b239e86b153736bceebccf4ea79d90b360608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b60a05260805160a051610c526100e56000396000610287015260006101b20152610c526000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c8063627cdcb91161005b578063627cdcb9146100c55780637aa8b5ad146100cd578063ed2a2d64146100ed578063fe04b1061461010d57600080fd5b8063042c7aa3146100825780633644e51514610097578063428d3d0b146100b2575b600080fd5b610095610090366004610718565b610134565b005b61009f6101ae565b6040519081526020015b60405180910390f35b6100956100c03660046107bc565b6102a9565b6100956105df565b6100e06100db3660046108d1565b61062d565b6040516100a9919061095f565b61009f6100fb366004610979565b60016020526000908152604090205481565b61009f7fad167d3025c204a322703b7e9c41f6179d0d174570f484391f50080b960d41d681565b336000908152602081815260408083208684529091529020610157828483610a38565b50823373ffffffffffffffffffffffffffffffffffffffff167f4e739a47dfa4fd3cfa92f8fe760cebe125565927e5c422cb28e7aa388a067af984846040516101a1929190610b9c565b60405180910390a3505050565b60007f000000000000000000000000000000000000000000000000000000000000000046146102845761027f604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f6124ff9f656d31cbb8918f3698282fe3b3527cc4dede357f0fbf535d197bbb7f918101919091527fe6bbd6277e1bf288eed5e8d1780f9a50b239e86b153736bceebccf4ea79d90b360608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b905090565b507f000000000000000000000000000000000000000000000000000000000000000090565b6000806102b46101ae565b73ffffffffffffffffffffffffffffffffffffffff8816600090815260016020818152604092839020805492830190559151610319927fad167d3025c204a322703b7e9c41f6179d0d174570f484391f50080b960d41d6928b928a928a929101610bb8565b604051602081830303815290604052805190602001206040516020016103719291907f190100000000000000000000000000000000000000000000000000000000000081526002810192909252602282015260420190565b6040516020818303038152906040528051906020012091508451604103610402576020858101516040808801516060808a015183516000808252968101808652899052951a928501839052840183905260808401819052919260019060a0016020604051602081039080840390855afa1580156103f2573d6000803e3d6000fd5b5050506020604051035193505050505b73ffffffffffffffffffffffffffffffffffffffff8116158061045157508673ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614155b801561051457506040517f1626ba7e000000000000000000000000000000000000000000000000000000008082529073ffffffffffffffffffffffffffffffffffffffff891690631626ba7e906104ae9086908a90600401610bea565b602060405180830381865afa1580156104cb573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104ef9190610c03565b7fffffffff000000000000000000000000000000000000000000000000000000001614155b1561054b576040517fc5c2e66100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b73ffffffffffffffffffffffffffffffffffffffff87166000908152602081815260408083208984529091529020610584848683610a38565b50858773ffffffffffffffffffffffffffffffffffffffff167f4e739a47dfa4fd3cfa92f8fe760cebe125565927e5c422cb28e7aa388a067af986866040516105ce929190610b9c565b60405180910390a350505050505050565b3360008181526001602081815260409283902080549092019182905591519081527fa82a649bbd060c9099cd7b7326e2b0dc9e9af0836480e0f849dc9eaa79710b3b910160405180910390a2565b60006020818152928152604080822090935290815220805461064e90610994565b80601f016020809104026020016040519081016040528092919081815260200182805461067a90610994565b80156106c75780601f1061069c576101008083540402835291602001916106c7565b820191906000526020600020905b8154815290600101906020018083116106aa57829003601f168201915b505050505081565b60008083601f8401126106e157600080fd5b50813567ffffffffffffffff8111156106f957600080fd5b60208301915083602082850101111561071157600080fd5b9250929050565b60008060006040848603121561072d57600080fd5b83359250602084013567ffffffffffffffff81111561074b57600080fd5b610757868287016106cf565b9497909650939450505050565b803573ffffffffffffffffffffffffffffffffffffffff8116811461078857600080fd5b919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6000806000806000608086880312156107d457600080fd5b6107dd86610764565b945060208601359350604086013567ffffffffffffffff8082111561080157600080fd5b818801915088601f83011261081557600080fd5b8135818111156108275761082761078d565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0908116603f0116810190838211818310171561086d5761086d61078d565b816040528281528b602084870101111561088657600080fd5b8260208601602083013760006020848301015280975050505060608801359150808211156108b357600080fd5b506108c0888289016106cf565b969995985093965092949392505050565b600080604083850312156108e457600080fd5b6108ed83610764565b946020939093013593505050565b6000815180845260005b8181101561092157602081850181015186830182015201610905565b5060006020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b60208152600061097260208301846108fb565b9392505050565b60006020828403121561098b57600080fd5b61097282610764565b600181811c908216806109a857607f821691505b6020821081036109e1577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b50919050565b601f821115610a33576000816000526020600020601f850160051c81016020861015610a105750805b601f850160051c820191505b81811015610a2f57828155600101610a1c565b5050505b505050565b67ffffffffffffffff831115610a5057610a5061078d565b610a6483610a5e8354610994565b836109e7565b6000601f841160018114610ab65760008515610a805750838201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b1c1916600186901b178355610b4c565b6000838152602090207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0861690835b82811015610b055786850135825560209485019460019092019101610ae5565b5086821015610b40577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88860031b161c19848701351681555b505060018560011b0183555b5050505050565b8183528181602085013750600060208284010152600060207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f840116840101905092915050565b602081526000610bb0602083018486610b53565b949350505050565b858152846020820152608060408201526000610bd8608083018587610b53565b90508260608301529695505050505050565b828152604060208201526000610bb060408301846108fb565b600060208284031215610c1557600080fd5b81517fffffffff000000000000000000000000000000000000000000000000000000008116811461097257600080fdfea164736f6c6343000817000a';

export { ERC5564_BYTECODE, ERC6538_BYTECODE };