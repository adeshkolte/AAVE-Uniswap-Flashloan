const { ethers } = require('hardhat');

// Deploy function
async function deploy() {
   [account] = await ethers.getSigners();
   deployerAddress = account.address;
   console.log(`Deploying contracts using ${deployerAddress}`);

   //Deploy WETH
   const weth = await ethers.getContractFactory('WETH');
   const wethInstance = await weth.deploy();

   console.log(`WETH deployed to : ${wethInstance.address}`);

   //Deploy Factory
   const factory = await ethers.getContractFactory('UniswapV2Factory');
   const factoryInstance = await factory.deploy(deployerAddress);

   console.log(`Factory deployed to : ${factoryInstance.address}`);

   //Deploy Router passing Factory Address and WETH Address
   const router = await ethers.getContractFactory('UniswapV2Router02');
   const routerInstance = await router.deploy(
      factoryInstance.address,
      wethInstance.address
   );
   await routerInstance.deployed();

   console.log(`Router V02 deployed to :  ${routerInstance.address}`);

   //Deploy Tokens
   // for mainnet you have to remove this tokens  
   const tok1 = await ethers.getContractFactory('Token');
   const tok1Instance = await tok1.deploy('TestETH', 'ETH');

   console.log(`Token1 deployed to : ${tok1Instance.address}`);

   const tok2 = await ethers.getContractFactory('Token');
   const tok2Instance = await tok2.deploy('TestDAI', 'DAI');

   console.log(`Token2 deployed to : ${tok2Instance.address}`);
   
   //Approve router on tokens
   console.log(`Approving Router on TestETH`);
   await tok1Instance.approve(
      routerInstance.address,
      '1000000000000000000000000'
   );
   console.log(`Approving Router on TestDAI`);
   await tok2Instance.approve(
      routerInstance.address,
      '1000000000000000000000000'
   );
   
   //Create Pair with Factory and Get Address
   await factoryInstance.createPair(tok1Instance.address, tok2Instance.address);
   const lpAddress = await factoryInstance.getPair(
      tok1Instance.address,
      tok2Instance.address
   );
   console.log(`Liquidity pool at address: ${lpAddress}`);
   
   //Get Block TimeStamp
   const blockTime = (await ethers.provider.getBlock()).timestamp;

   //Add Liquidity
   console.log(`Adding Liquidity...`);
   await routerInstance.addLiquidity(
      tok1Instance.address,
      tok2Instance.address,
      '70000000000000000000',
      '1000000000000000000000',
      '70000000000000000000',
      '100000000000000000000',
      deployerAddress,
      blockTime + 100
   );

//if not deploying on mainnet/kovan/ropsten, then change the addressProvider in ./aave/FlashLoanReceiverBase.sol to the relevant address
// add relevant address in  provideraddress


const flashLoan = await ethers.getContractFactory('FlashLoan');
const flashLoaninstance = await flashLoan.deploy(
   routerInstance.address,address.provideraddress);
await flashLoaninstance.deployed();
console.log(`Flash Loan deployed to : ${flashLoaninstance.address}`);
console.log('calling flash loan ');
await flashLoaninstance.flashLoan(tok1Instance.address, '500000000000000000000',tok2Instance );

}
deploy()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
