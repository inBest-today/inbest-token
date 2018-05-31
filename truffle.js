
const WalletProvider = require("truffle-hdwallet-provider-privkey");
const privKey = require('fs').readFileSync('./infura_privKey').toString();
const apiKey = require('fs').readFileSync('./infura_apiKey').toString();


module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 4500000,
    },
    mainnet: {
      provider: new WalletProvider(privKey, "https://mainnet.infura.io/"+ apiKey),
      host: 'localhost',
      port: 8545,
      network_id: '1', // Match any network id
      gas: 4500000,
      gasPrice: 10000000000
    },
    ropsten: {
      provider: new WalletProvider(privKey, "https://ropsten.infura.io/"+ apiKey),
      host: 'localhost',
      port: 8545,
      network_id: '3', // Match any network id
      gas: 4500000,
      gasPrice: 10000000000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
