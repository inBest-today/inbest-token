pragma solidity ^0.4.18;

import './InbestToken.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Inbest Token initial distribution
 *
 * @dev Distribute Investors' and Company's tokens
 */
contract InbestDistribution is Ownable {
  using SafeMath for uint256;

  // Token
  InbestToken public IBST;

  // Status of admins
  mapping (address => bool) public admins;

  // Number of decimal places for tokens
  uint256 private constant DECIMALFACTOR = 10**uint256(18);

  // Cliff period = 6 months
  uint256 CLIFF = 180 days;  
  // Vesting period = 12 months after cliff
  uint256 VESTING = 365 days; 

  // Total of tokens
  uint256 public constant INITIAL_SUPPLY   =    1e6 * DECIMALFACTOR; // 1.000.000 IBST TBD
  // Total of available tokens
  uint256 public AVAILABLE_TOTAL_SUPPLY    =    1e6 * DECIMALFACTOR; // 1.000.000 IBST TBD
  // Total of available tokens for presale allocations
  uint256 public AVAILABLE_PRESALE_SUPPLY  =     5e5 * DECIMALFACTOR; // 50% Released, 18 months vesting, 6 months cliff TBD
  // Total of available tokens for company allocation
  uint256 public AVAILABLE_COMPANY_SUPPLY  =     5e5 * DECIMALFACTOR; // 50% Released at token distribution event TBD

  // Allocation types
  enum AllocationType { PRESALE, COMPANY}

  // Amount of total tokens claimed
  uint256 public grandTotalClaimed = 0;
  // Time when InbestDistribution goes live
  uint256 public startTime;

  // The only wallet allowed for Company supply
  address public companyWallet;

  // Allocation with vesting and cliff information
  struct Allocation {
    uint8 allocationType;   // Type of allocation
    uint256 endCliff;       // Tokens are locked until
    uint256 endVesting;     // This is when the tokens are fully unvested
    uint256 totalAllocated; // Total tokens allocated
    uint256 amountClaimed;  // Total tokens claimed
  }
  mapping (address => Allocation) public allocations;

  // Modifier to control who executes functions
  modifier onlyOwnerOrAdmin() {
    require(msg.sender == owner || admins[msg.sender]);
    _;
  }

  // Event fired when a new allocation is made
  event LogNewAllocation(address indexed _recipient, AllocationType indexed _fromSupply, uint256 _totalAllocated, uint256 _grandTotalAllocated);
  // Event fired when IBST tokens are claimed
  event LogIBSTClaimed(address indexed _recipient, uint8 indexed _fromSupply, uint256 _amountClaimed, uint256 _totalAllocated, uint256 _grandTotalClaimed);
  // Event fired when admins are modified
  event SetAdmin(address _caller, address _admin, bool _allowed);
  // Event fired when refunding tokens mistakenly sent to contract
  event RefundTokens(address _token, address _refund, uint256 _value);

  /**
    * @dev Constructor function - Set the inbest token address
    * @param _startTime The time when InbestDistribution goes live
    * @param _companyWallet The wallet to allocate Company tokens
    */
  function InbestDistribution(uint256 _startTime, address _companyWallet) public {
    require(_companyWallet != address(0));
    require(_startTime >= now);
    require(AVAILABLE_TOTAL_SUPPLY == AVAILABLE_PRESALE_SUPPLY.add(AVAILABLE_COMPANY_SUPPLY));
    startTime = _startTime;
    companyWallet = _companyWallet;
    IBST = new InbestToken();
    require(AVAILABLE_TOTAL_SUPPLY == IBST.totalSupply()); //To verify that totalSupply is correct

    // Allocate Company Supply
    uint256 tokensToAllocate = AVAILABLE_COMPANY_SUPPLY;
    AVAILABLE_COMPANY_SUPPLY = 0;
    allocations[companyWallet] = Allocation(uint8(AllocationType.COMPANY), 0, 0, tokensToAllocate, 0);
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(tokensToAllocate);
    LogNewAllocation(companyWallet, AllocationType.COMPANY, tokensToAllocate, grandTotalAllocated());
  }

  /**
    * @dev Allow the owner or admins of the contract to assign a new allocation
    * @param _recipient The recipient of the allocation
    * @param _totalAllocated The total amount of IBST tokens available to the receipient (after vesting and cliff)
    */
  function setAllocation (address _recipient, uint256 _totalAllocated) public onlyOwnerOrAdmin {
    require(_recipient != address(0));
    require(startTime > now); //Allocations are allowed only before starTime
    require(AVAILABLE_PRESALE_SUPPLY >= _totalAllocated); //Current allocation must be less than remaining presale supply
    require(allocations[_recipient].totalAllocated == 0 && _totalAllocated > 0); // Must be the first and only allocation for this recipient
    require(_recipient != companyWallet); // Receipient of presale allocation can't be company wallet

    // Allocate
    AVAILABLE_PRESALE_SUPPLY = AVAILABLE_PRESALE_SUPPLY.sub(_totalAllocated);
    allocations[_recipient] = Allocation(uint8(AllocationType.PRESALE), startTime.add(CLIFF), startTime.add(CLIFF).add(VESTING), _totalAllocated, 0);
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(_totalAllocated);
    LogNewAllocation(_recipient, AllocationType.PRESALE, _totalAllocated, grandTotalAllocated());
  }

  /**
   * @dev Transfer a recipients available allocation to their address
   * @param _recipient The address to withdraw tokens for
   */
 function transferTokens (address _recipient) public {
   require(_recipient != address(0));
   require(now >= startTime); //Tokens can't be transfered until start date
   require(_recipient != companyWallet); // Tokens allocated to COMPANY can't be withdrawn.
   require(now >= allocations[_recipient].endCliff); // Cliff period must be ended
   // Receipient can't claim more IBST tokens than allocated
   require(allocations[_recipient].amountClaimed < allocations[_recipient].totalAllocated);

   uint256 newAmountClaimed;
   if (allocations[_recipient].endVesting > now) {
     // Transfer available amount based on vesting schedule and allocation
     newAmountClaimed = allocations[_recipient].totalAllocated.mul(now.sub(allocations[_recipient].endCliff)).div(allocations[_recipient].endVesting.sub(allocations[_recipient].endCliff));
   } else {
     // Transfer total allocated (minus previously claimed tokens)
     newAmountClaimed = allocations[_recipient].totalAllocated;
   }

   //Transfer
   uint256 tokensToTransfer = newAmountClaimed.sub(allocations[_recipient].amountClaimed);
   allocations[_recipient].amountClaimed = newAmountClaimed;
   require(IBST.transfer(_recipient, tokensToTransfer));
   grandTotalClaimed = grandTotalClaimed.add(tokensToTransfer);
   LogIBSTClaimed(_recipient, allocations[_recipient].allocationType, tokensToTransfer, newAmountClaimed, grandTotalClaimed);
 }

 /**
  * @dev Transfer IBST tokens from Company allocation to reicipient address - Only owner and admins can execute
  * @param _recipient The address to transfer tokens for
  * @param _tokensToTransfer The amount of IBST tokens to transfer
  */
 function manualContribution(address _recipient, uint256 _tokensToTransfer) public onlyOwnerOrAdmin {
   require(_recipient != address(0));
   require(_recipient != companyWallet); // Company can't withdraw tokens for itself
   require(_tokensToTransfer > 0); // The amount must be valid
   require(now >= startTime); // Tokens cant't be transfered until start date
   //Company can't trasnfer more tokens than allocated
   require(allocations[companyWallet].amountClaimed.add(_tokensToTransfer) <= allocations[companyWallet].totalAllocated);

   //Transfer
   allocations[companyWallet].amountClaimed = allocations[companyWallet].amountClaimed.add(_tokensToTransfer);
   require(IBST.transfer(_recipient, _tokensToTransfer));
   grandTotalClaimed = grandTotalClaimed.add(_tokensToTransfer);
   LogIBSTClaimed(_recipient, uint8(AllocationType.COMPANY), _tokensToTransfer, allocations[companyWallet].amountClaimed, grandTotalClaimed);
 }

 /**
  * @dev Returns remaining Company allocation
  * @return Returns remaining Company allocation
  */
 function companyRemainingAllocation() public view returns (uint256) {
   return allocations[companyWallet].totalAllocated.sub(allocations[companyWallet].amountClaimed);
 }

 /**
  * @dev Returns the amount of IBST allocated
  * @return Returns the amount of IBST allocated
  */
  function grandTotalAllocated() public view returns (uint256) {
    return INITIAL_SUPPLY.sub(AVAILABLE_TOTAL_SUPPLY);
  }

  /**
   * @dev Admin management
   * @param _admin Address of the admin to modify
   * @param _allowed Status of the admin
   */
  function setAdmin(address _admin, bool _allowed) public onlyOwner {
    require(_admin != address(0));
    admins[_admin] = _allowed;
     SetAdmin(msg.sender,_admin,_allowed);
  }

  function refundTokens(address _token, address _refund, uint256 _value) public onlyOwner {
    require(_refund != address(0));
    require(_token != address(0));
    require(_token != address(IBST));
    ERC20 token = ERC20(_token);
    require(token.transfer(_refund, _value));
    RefundTokens(_token, _refund, _value);
  }
}
