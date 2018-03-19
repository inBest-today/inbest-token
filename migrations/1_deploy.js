var InbestToken = artifacts.require('./InbestToken.sol');
var InbestDistribution = artifacts.require('./InbestDistribution.sol');

module.exports = async (deployer, network) => {
  let _now = Date.now();
  let _fromNow = 1 * 60 * 1000; // TBD Start distribution in 1 hour
  let _startTime = (_now + _fromNow) / 1000;
  await deployer.deploy(InbestDistribution, _startTime, '0xAc4BA9E98E97294C7D3E3e2d19C7a936e187B1BF'); //TBD
  console.log(`
    ---------------------------------------------------------------
    --------- INBEST (IBST) TOKEN SUCCESSFULLY DEPLOYED ---------
    ---------------------------------------------------------------
    - Contract address: ${InbestDistribution.address}
    - Distribution starts in: ${_fromNow/1000/60} minutes
    - Local Time: ${new Date(_now + _fromNow)}
    ---------------------------------------------------------------
  `);
};
