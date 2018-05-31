const InbestDistribution = artifacts.require("./InbestDistribution.sol");
const InbestToken = artifacts.require("./InbestToken.sol");
const Web3 = require('web3')

var BigNumber = require('bignumber.js')

//The following line is required to use timeTravel with web3 v1.x.x
Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545")) // Hardcoded development port

const timeTravel = function (time) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [time], // 86400 is num seconds in day
      id: new Date().getTime()
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

const mineBlock = function () {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "evm_mine"
    }, (err, result) => {
      if(err){ return reject(err) }
      return resolve(result)
    });
  })
}

const logTitle = function (title) {
  console.log("*****************************************");
  console.log(title);
  console.log("*****************************************");
}

const logError = function (err) {
  console.log("-----------------------------------------");
  console.log(err);
  console.log("-----------------------------------------");
}

function logWithdrawalData(_allocationType, _currentBlockTime, _account_presale, _contractStartTime, _allocation, _tokensClaimed, _new_presale_tokenBalance){
   console.log("\n");
   logTitle("Review tokens withdrawn for "+ _allocationType +" account:\n" + _account_presale);
   console.log("Current time:", _currentBlockTime.toString(10));
   console.log("Start time:", _contractStartTime.toString(10));
   console.log("Cliff End:", _allocation[1].toString(10));
   console.log("Vesting End:", _allocation[2].toString(10));
   console.log("Tokens Allocated:", _allocation[3].toString(10));
   console.log("Tokens Claimed this time:", _tokensClaimed.toString(10));
   console.log("Total Tokens Claimed:", _allocation[4].toString(10));
   console.log("IBST token balance:", _new_presale_tokenBalance.toString(10));
   console.log("\n");
 }

 function logContributionData(_allocationType, _currentBlockTime, _account_company, _contractStartTime, _allocation, _tokensSent, _receipientAccount, _new_receipent_tokenBalance){
    console.log("\n");
    logTitle("Review for "+ _allocationType +" account:\n" + _account_company);
    console.log("Current time:", _currentBlockTime.toString(10));
    console.log("Start time:", _contractStartTime.toString(10));
    console.log("Tokens Allocated:", _allocation[3].toString(10));
    console.log("Total Remaining:", _allocation[3].minus(_allocation[4]).toString(10));
    console.log("Tokens sent this time:", _tokensSent.toString(10));
    console.log("IBST token balance for receipient account (" + _receipientAccount + "):", _new_receipent_tokenBalance.toString(10));
    console.log("\n");
  }

 function calculateExpectedTokens(_allocation, _currentTime, _contractStartTime){
  //If fully vested (vesting time >= now) return all the allocation, else, calculate the proportion
  if(_currentTime >= _allocation[2].toNumber())
    return _allocation[3];
  else {
    return ((_allocation[3].times( new BigNumber(_currentTime).minus(new BigNumber(_allocation[1])))).dividedBy(new BigNumber(_allocation[2]).minus(new BigNumber(_allocation[1])))).floor();
  }
}

contract('InbestDistribution', function(accounts) {

  let inbestDistribution;
  let inbestToken;
  let inbestTokenAddress;
  let timeOffset = 3600 * 24 * 30; // Starts in 30 days
  let _startTime = Math.floor(new Date().getTime() /1000 + timeOffset); // Starts 30 days from now
  const DECIMALSFACTOR = new BigNumber(10).pow(18);
  let initialCompanyAllocation = 13.5e9 * DECIMALSFACTOR;
  let totalSupply = 14e9 * DECIMALSFACTOR;

  let account_owner              = accounts[0];
  let account_companyWallet      = accounts[1];
  let account_presale1           = accounts[2];
  let account_presale2           = accounts[3];
  let account_presale3           = accounts[6];
  let account_manual1            = accounts[7];
  let account_manual2            = accounts[8];
  let account_admin              = accounts[9];

  let contractStartTime;

  let allocationStruct = {
    AllocationType: 0,    // Type of allocation
    endCliff: 0,            // Tokens are locked until
    endVesting: 0,          // This is when the tokens are fully unvested
    totalAllocated: 0,       // Total tokens allocated
    amountClaimed: 0        // Total tokens claimed
  }

  function setAllocationStruct(_struct){
    allocationStruct.AllocationType = _struct[0].toNumber();
    allocationStruct.endCliff = _struct[1].toNumber();
    allocationStruct.endVesting = _struct[2].toNumber();
    allocationStruct.totalAllocated = _struct[3].toNumber();
    allocationStruct.amountClaimed = _struct[4].toNumber();
  }

  before(async() => {
        inbestDistribution = await InbestDistribution.new(_startTime,account_companyWallet,{from:account_owner});
        inbestTokenAddress = await inbestDistribution.IBST({from:account_owner});
        inbestToken = await InbestToken.at(inbestTokenAddress);

        contractStartTime = await inbestDistribution.startTime({from:account_owner});
    });

  describe("All tests", async function () {

    describe("Test Constructor", async function () {

      it("should have deployed InbestToken", async function () {
        logTitle("InbestToken Address: "+ inbestTokenAddress);
        assert.notEqual(inbestTokenAddress.valueOf(), "0x0000000000000000000000000000000000000000", "Token was not initialized");
      });

      it("should set contract start time", async function () {
        let startTime = await inbestDistribution.startTime({from:account_owner});

        assert.equal(startTime, _startTime);
      });

      it("should allocate to Company wallet", async function () {
        let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
        setAllocationStruct(allocation);

        console.log("Allocation:",allocationStruct);

        assert.equal(allocationStruct.totalAllocated, initialCompanyAllocation);
        assert.equal(allocationStruct.AllocationType, 1);
      });
    });

    //////////////
    // Admin tests
    //////////////
    describe("Administrator tests", async function () {
      it("should add companyWallet account as new admin", async function () {
        await inbestDistribution.setAdmin(account_companyWallet, true, {from:account_owner});

        let isAdmin = await inbestDistribution.admins(account_companyWallet, {from:account_owner});
        assert.equal(isAdmin, true);
      });

      it("should remove companyWallet as admin", async function () {
        await inbestDistribution.setAdmin(account_companyWallet, false, {from:account_owner});

        let isAdmin = await inbestDistribution.admins(account_companyWallet, {from:account_owner});
        assert.equal(isAdmin, false);
      });

      it("should add admin account as new admin", async function () {
        await inbestDistribution.setAdmin(account_admin, true, {from:account_owner});

        let isAdmin = await inbestDistribution.admins(account_admin, {from:account_owner});
        assert.equal(isAdmin, true);
      });

      it("should fail to add account as new admin as caller is not an admin", async function () {
        try {
          await inbestDistribution.setAdmin(account_admin, true, {from:account_companyWallet});
        } catch (error) {
            let isAdmin = await inbestDistribution.admins(account_admin, {from:account_companyWallet});
            assert.equal(isAdmin, true);
            logError("✅   Failed to add admin");
            return true;
        }
        throw new Error("I should never see this!");

        let isAdmin = await inbestDistribution.admins(account_admin, {from:account_companyWallet});
        assert.equal(isAdmin, true);
      });

    });

    //////////////
    // Allocation tests
    ///////////////////

    describe("Allocation tests", async function () {
      it("should get initial amount of tokens allocated for company", async function () {
        let remainingAllocation = await inbestDistribution.companyRemainingAllocation({from:account_owner});

        assert.equal(remainingAllocation, initialCompanyAllocation);
      });

      it("should get the amount of allocated tokens for company", async function () {
        let allocatedTokens = await inbestDistribution.grandTotalAllocated({from:account_owner});

        assert.equal(allocatedTokens.toString(10), new BigNumber(initialCompanyAllocation).toString(10));
      });

      it("should allocate to first presale investor by owner", async function () {
        let tokenAllocation = 50000000 * DECIMALSFACTOR;
        await inbestDistribution.setAllocation(account_presale1,tokenAllocation,{from:account_owner});
        let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
        setAllocationStruct(allocation);

        console.log("Allocation:",allocationStruct);

        // Allocation must be equal to the passed tokenAllocation
        assert.equal(allocationStruct.totalAllocated, tokenAllocation);
        assert.equal(allocationStruct.AllocationType, 0);
        assert.equal(allocationStruct.endCliff, _startTime + (3600 * 24 * 180));
        assert.equal(allocationStruct.endVesting, _startTime + (3600 * 24 * 545));
      });

      it("should get the amount of allocated tokens for company and first presale investor", async function () {
        let allocatedTokens = await inbestDistribution.grandTotalAllocated({from:account_owner});
        let tokenAllocation = 50000000 * DECIMALSFACTOR;

        let expectedAllocatedTokens = new BigNumber(initialCompanyAllocation).plus(new BigNumber(tokenAllocation));
        assert.equal(allocatedTokens.toString(10), expectedAllocatedTokens.toString(10));
      });

      it("should not allocate to first presale investor as it is already allocated", async function () {
        let tokenAllocation = 1000000 * DECIMALSFACTOR;
        try {
          await inbestDistribution.setAllocation(account_presale1,tokenAllocation,{from:account_owner});
        } catch (error) {
            let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
            setAllocationStruct(allocation);
            console.log("Allocation:",allocationStruct);
            assert.notEqual(allocationStruct.totalAllocated, 0);
            logError("✅   Failed to allocate");
            return true;
        }
        throw new Error("I should never see this!");
      });

      it("should fail to allocate to companyWallet", async function () {
        let tokenAllocation = 1000000 * DECIMALSFACTOR;
        try {
          await inbestDistribution.setAllocation(account_companyWallet,tokenAllocation,{from:account_owner});
        } catch (error) {
            let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
            setAllocationStruct(allocation);
            console.log("Allocation:",allocationStruct);
            assert.notEqual(allocationStruct.totalAllocated, 0);
            logError("✅   Failed to allocate");
            return true;
        }
        throw new Error("I should never see this!");
      });

      it("should fail to allocate second presale investor as caller is not admin", async function () {
        let tokenAllocation = 1000000 * DECIMALSFACTOR;
        try {
          await inbestDistribution.setAllocation(account_companyWallet,tokenAllocation,{from:account_companyWallet});
        } catch (error) {
            let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_companyWallet});
            setAllocationStruct(allocation);
            console.log("Allocation:",allocationStruct);
            assert.notEqual(allocationStruct.totalAllocated, 0);
            logError("✅   Failed to allocate");
            return true;
        }
        throw new Error("I should never see this!");
      });

      it("should allocate to second presale investor by admin", async function () {
        let tokenAllocation = 450000000 * DECIMALSFACTOR;
        await inbestDistribution.setAllocation(account_presale2,tokenAllocation,{from:account_admin});
        let allocation = await inbestDistribution.allocations(account_presale2,{from:account_admin});
        setAllocationStruct(allocation);

        console.log("Allocation:",allocationStruct);

        // Allocation must be equal to the passed tokenAllocation
        assert.equal(allocationStruct.totalAllocated, tokenAllocation);
        assert.equal(allocationStruct.AllocationType, 0);
        assert.equal(allocationStruct.endCliff, _startTime + (3600 * 24 * 180));
        assert.equal(allocationStruct.endVesting, _startTime + (3600 * 24 * 545));
      });

      it("should get the total supply amount of tokens", async function () {
        let allocatedTokens = await inbestDistribution.grandTotalAllocated({from:account_owner});

        let expectedAllocatedTokens = new BigNumber(totalSupply);
        assert.equal(allocatedTokens.toString(10), expectedAllocatedTokens.toString(10));
      });

      it("should not allocate to third presale investor as all presale tokens have been allocated", async function () {
        let tokenAllocation = 1000 * DECIMALSFACTOR;
        try {
          await inbestDistribution.setAllocation(account_presale3,tokenAllocation,{from:account_owner});
        } catch (error) {
            let allocation = await inbestDistribution.allocations(account_presale3,{from:account_owner});
            setAllocationStruct(allocation);
            console.log("Allocation:",allocationStruct);
            assert.equal(allocationStruct.totalAllocated, 0);
            logError("✅   Failed to allocate");
            return true;
        }
        throw new Error("I should never see this!");
      });
    });

    describe("Withdraw and Contribution tests", async function () {

      describe("Withdraw before startTime", async function () {
        it("should fail to withdraw PRESALE as startTime not reached", async function () {
          try {
            await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");
              let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
              logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,0,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should fail to transfer tokens by manual contribution as startTime not reached", async function () {
          try {
            await inbestDistribution.manualContribution(account_manual1, 20000 * DECIMALSFACTOR,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");
              let new_tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
              logWithdrawalData("COMPANY",currentBlock.timestamp,account_presale1,contractStartTime,allocation,0,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });
      });

      describe("Withdraw 3 months after allocations", async function () {
        before(async() => {
          //Time travel to startTime;
          await timeTravel(timeOffset)// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336

          //Time travel to startTime + 3 months;
          await timeTravel((3600 * 24 * 90))// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should fail to transfer tokens by manual contribution to companyWallet", async function () {
          let tokensToTransfer = 1000000000 * DECIMALSFACTOR;
          try {
            await inbestDistribution.manualContribution(account_companyWallet,tokensToTransfer,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_companyWallet,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
              logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,0,account_companyWallet,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should fail to withdraw COMPANY tokens as they can not be withdrawn", async function () {
          try {
            await inbestDistribution.transferTokens(account_companyWallet,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
              logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,0,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should fail to transfer zero tokens by manual contribution", async function () {
          try {
            await inbestDistribution.manualContribution(account_manual1,0,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
              logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,0,account_companyWallet,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should fail to transfer tokens by manual contribution as caller is not an admin", async function () {
          let tokensToTransfer = 1000000000 * DECIMALSFACTOR;
          try {
            await inbestDistribution.manualContribution(account_manual1,tokensToTransfer,{from:account_companyWallet});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
              logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,0,account_companyWallet,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should fail to withdraw PRESALE tokens as cliff period was not reached", async function () {
          try {
            await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
              logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,0,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });

        it("should transfer tokens by manual contribution to a first address called by owner", async function () {
          let tokensToTransfer = 4000000000 * DECIMALSFACTOR;
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_owner});
          let receipt = await inbestDistribution.manualContribution(account_manual1,tokensToTransfer,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_owner});

          let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});

          logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,tokensClaimed,account_manual1,new_tokenBalance);

          let expectedTokenBalance = (new BigNumber(tokenBalance).plus(new BigNumber(tokensToTransfer))).toString(10);
          assert.equal(new_tokenBalance.toString(10),expectedTokenBalance);
        });

        it("should get remaining tokens allocated for company", async function () {
          let remainingAllocation = await inbestDistribution.companyRemainingAllocation({from:account_owner});
          let tokensTransfered = 4000000000 * DECIMALSFACTOR;
          let remainingTokens = new BigNumber(initialCompanyAllocation).minus(new BigNumber(tokensTransfered));
          assert.equal(remainingAllocation.toString(10), remainingTokens.toString(10));
        });

        it("should transfer tokens by manual contribution to first address called by admin", async function () {
          let tokensToTransfer = 2000000000 * DECIMALSFACTOR;
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_admin});
          let receipt = await inbestDistribution.manualContribution(account_manual1,tokensToTransfer,{from:account_admin});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_manual1,{from:account_admin});

          let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_admin});

          logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,tokensClaimed,account_manual1,new_tokenBalance);

          let expectedTokenBalance = (new BigNumber(tokenBalance).plus(new BigNumber(tokensToTransfer))).toString(10);
          assert.equal(new_tokenBalance.toString(10),expectedTokenBalance);
        });
      });

      describe("Withdraw 6 months after allocations", async function () {
        before(async() => {
          //Time travel to startTime + 6 months;
          await timeTravel((3600 * 24 * 90))// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw first presale investor tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
          let receipt = await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});

          logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,tokensClaimed,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);

          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should transfer tokens by manual contribution to a second address", async function () {
          let tokensToTransfer = 3000000000 * DECIMALSFACTOR;
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_manual2,{from:account_owner});
          let receipt = await inbestDistribution.manualContribution(account_manual2,tokensToTransfer,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_manual2,{from:account_owner});

          let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});

          logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,tokensClaimed,account_manual2,new_tokenBalance);

          let expectedTokenBalance = (new BigNumber(tokenBalance).plus(new BigNumber(tokensToTransfer))).toString(10);
          assert.equal(new_tokenBalance.toString(10),expectedTokenBalance);
        });

        it("should fail to transfer by manual contribution more tokens than allocated", async function () {
          let tokensToTransfer = 5000000000 * DECIMALSFACTOR;
          try {
            await inbestDistribution.manualContribution(account_manual2,tokensToTransfer,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_manual2,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});
              logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,0,account_manual2,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!");
        });
      });

      describe("Withdraw 9 months after allocations", async function () {
        before(async() => {
          //Time travel to startTime + 9 months;
          await timeTravel((3600 * 24 * 93.75))// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw first presale investor tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
          let receipt = await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});

          logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,tokensClaimed,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);

          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });
      });

      describe("Withdraw 12 months after allocations", async function () {
        before(async() => {

          //Time travel to startTime + 12 months;
          await timeTravel((3600 * 24 * 91.25))// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw first presale investor tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
          let receipt = await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});

          logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,tokensClaimed,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);

          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        

        it("should transfer tokens by manual contribution to second address", async function () {
          let tokensToTransfer = 2000000000 * DECIMALSFACTOR;
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_manual2,{from:account_owner});
          let receipt = await inbestDistribution.manualContribution(account_manual2,tokensToTransfer,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_manual2,{from:account_owner});

          let allocation = await inbestDistribution.allocations(account_companyWallet,{from:account_owner});

          logContributionData("COMPANY",currentBlock.timestamp,account_companyWallet,contractStartTime,allocation,tokensClaimed,account_manual2,new_tokenBalance);

          let expectedTokenBalance = (new BigNumber(tokenBalance).plus(new BigNumber(tokensToTransfer))).toString(10);
          assert.equal(new_tokenBalance.toString(10),expectedTokenBalance);
        });

        it("should get remaining tokens allocated for company", async function () {
          let remainingAllocation = await inbestDistribution.companyRemainingAllocation({from:account_owner});;
          let tokensTransfered = 11000000000 * DECIMALSFACTOR;
          let remainingTokens = new BigNumber(initialCompanyAllocation).minus(new BigNumber(tokensTransfered));
          assert.equal(remainingAllocation.toString(10), remainingTokens.toString(10));
        });

      });

      describe("Withdraw 18 months after allocations", async function () {
        before(async() => {

          //Time travel to startTime + 18 months;
          await timeTravel((3600 * 24 * 180))// Move forward in time so the crowdsale has started
          await mineBlock() // workaround for https://github.com/ethereumjs/testrpc/issues/336
        });

        it("should withdraw first presale investor tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
          let receipt = await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});

          logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,tokensClaimed,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);

          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should withdraw all second presale investor tokens", async function () {
          let currentBlock = await web3.eth.getBlock("latest");

          // Check token balance for account before calling transferTokens, then check afterwards.
          let tokenBalance = await inbestToken.balanceOf(account_presale2,{from:account_owner});
          let receipt = await inbestDistribution.transferTokens(account_presale2,{from:account_owner});
          let tokensClaimed = receipt.logs[0].args._amountClaimed;
          let new_tokenBalance = await inbestToken.balanceOf(account_presale2,{from:account_owner});

          //PRESALE tokens are completely distributed once allocated as they have no vesting period nor cliff
          let allocation = await inbestDistribution.allocations(account_presale2,{from:account_owner});

          logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale2,contractStartTime,allocation,tokensClaimed,new_tokenBalance);

          let expectedTokenBalance = calculateExpectedTokens(allocation,currentBlock.timestamp,contractStartTime);

          assert.equal(expectedTokenBalance.toString(10),new_tokenBalance.toString(10));
        });

        it("should fail to withdraw PRESALE tokens as investor has no tokens to claim", async function () {
          try {
            await inbestDistribution.transferTokens(account_presale1,{from:account_owner});
          } catch (error) {
              let currentBlock = await web3.eth.getBlock("latest");

              let new_tokenBalance = await inbestToken.balanceOf(account_presale1,{from:account_owner});
              let allocation = await inbestDistribution.allocations(account_presale1,{from:account_owner});
              logWithdrawalData("PRESALE",currentBlock.timestamp,account_presale1,contractStartTime,allocation,0,new_tokenBalance);

              logError("✅   Failed to withdraw");
              return true;
          }
          throw new Error("I should never see this!")
        });
      });
    });
  });
});
