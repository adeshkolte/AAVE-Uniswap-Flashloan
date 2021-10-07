pragma solidity ^0.6.0;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";
import "./periphery/interfaces/IUniswapV2Router02.sol";

/*

 * 1. Borrow TokenA from Aave
 * 2. Exchange the TokenA with TokenB on Uniswap
 
 */
contract FlashLoan is FlashLoanReceiverBase {
    ILendingPool public lendingPool;
    IUniswapV2Router02 public uniswapV2Router02;


    address[] public path;

   
    constructor(address _uniswapRouter, address _addressesProvider ) FlashLoanReceiverBase(_addressesProvider)
        public
    {
        address lendingPoolAddress = addressesProvider.getLendingPool();
        //Instantiate Aave Lending Pool
        lendingPool = ILendingPool(lendingPoolAddress);

        //Instantiate Uniswap V2 router 02
        uniswapV2Router02 = IUniswapV2Router02(_uniswapRouter);

       
    }

    function flashLoan(
        address tokenA,
        uint256 amount,
        address tokenB
    ) public onlyOwner {
        ERC20 TokenA = ERC20(tokenA);
        bytes memory params = abi.encode(tokenB);

        //  * 1. Borrow TokenA from Aave
        // flashLoan calls the executeOperation
        lendingPool.flashLoan(address(this), tokenA, amount, params);

        //  * 4. Left amount of TokenA
        //important: your contract must have enough funds of whatever asset you are borrowing to payback .
        uint256 checkbal = TokenA.balanceOf(address(this));
        
        require(
            TokenA.transfer(msg.sender, profit),
            "Could not transfer back the profit"
        );
    }

    /**
        This function is called after your contract has received the flash loaned amount
        https://github.com/aave/aave-protocol/blob/f7ef52000af2964046857da7e5fe01894a51f2ab/contracts/lendingpool/LendingPool.sol#L881
     */
    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    ) external override {
        require(
            _amount <= getBalanceInternal(address(this), _reserve),
            "Invalid balance, was the flashLoan successful?"
        );

        address _tokenB = abi.decode(_params, (address));

        //  * 2. Exchange TokenA with TokenB on Uniswap
        uint256 deadline = getDeadline();
        ERC20 TokenA = ERC20(_reserve);

        require(
            TokenA.approve(address(uniswapV2Router02), _amount),
            "Could not approve TokenA sell"
        );

        path.push(_reserve);
        path.push(_tokenB);

        uint256[] memory tokenBPurchased = uniswapV2Router02
            .swapExactTokensForTokens(
            _amount,
            1,
            path,
            address(this),
            deadline
        );


        //  * 3. Repay TokenA to Aave
        uint256 totalDebt = _amount.add(_fee);
        require(
            totalDebt <= getBalanceInternal(address(this), _reserve),
            "FlashLoan Fee amount not met."
        );
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }

    function getDeadline() internal view returns (uint256) {
        return block.timestamp + 3000;
    }
}
