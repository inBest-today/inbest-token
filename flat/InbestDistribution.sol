pragma solidity ^0.4.18;

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  /**
  * @dev Substracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  uint256 totalSupply_;

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

}

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public view returns (uint256) {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

/**
 * @title InbestToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract InbestToken is StandardToken {

  string public constant name = "Inbest Token"; // TBD
  string public constant symbol = "INB"; // TBD
  uint8 public constant decimals = 18;

  // TBD
  uint256 public constant INITIAL_SUPPLY = 1000000 * (10 ** uint256(decimals));

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  function InbestToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

}

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}

/**
 * @title Inbest Token initial distribution
 *
 * @dev Distribute Investors' and Company's tokens
 */
contract InbestDistribution is Ownable {
  using SafeMath for uint256;

  // Token
  InbestToken public INB;

  // Status of admins
  mapping (address => bool) public admins;

  // Number of decimal places for tokens
  uint256 private constant decimalFactor = 10**uint256(18);

  // Total of tokens
  uint256 public constant INITIAL_SUPPLY   =    1e6 * decimalFactor; // 1.000.000 INB
  // Total of available tokens
  uint256 public AVAILABLE_TOTAL_SUPPLY    =    1e6 * decimalFactor; // 1.000.000 INB
  // Total of available tokens for presale allocations
  uint256 public AVAILABLE_PRESALE_SUPPLY  =     5e5 * decimalFactor; // 50% Released, 12 months vesting, 6 months cliff
  // Total of available tokens for company allocation
  uint256 public AVAILABLE_COMPANY_SUPPLY  =     5e5 * decimalFactor; // 50% Released at token distribution event

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
    uint8 AllocationType;   // Type of allocation
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
  // Event fired when INB tokens are claimed
  event LogINBClaimed(address indexed _recipient, uint8 indexed _fromSupply, uint256 _amountClaimed, uint256 _totalAllocated, uint256 _grandTotalClaimed);
  // Event fired when admins are modified
  event SetAdmin(address _caller, address _admin, bool _allowed);
  // Event fired when refunding tokens mistakenly sent to contract
  event RefundTokens(address _token, address _refund, uint _value);

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
    INB = new InbestToken();

    // Allocate Company Supply
    uint tokensToAllocate = AVAILABLE_COMPANY_SUPPLY;
    AVAILABLE_COMPANY_SUPPLY = 0;
    allocations[companyWallet] = Allocation(uint8(AllocationType.COMPANY), 0, 0, tokensToAllocate, 0);
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(tokensToAllocate);
    LogNewAllocation(companyWallet, AllocationType.COMPANY, tokensToAllocate, grandTotalAllocated());
  }

  /**
    * @dev Allow the owner or admins of the contract to assign a new allocation
    * @param _recipient The recipient of the allocation
    * @param _totalAllocated The total amount of INB tokens available to the receipient (after vesting and cliff)
    */
  function setAllocation (address _recipient, uint256 _totalAllocated) onlyOwnerOrAdmin public {
    require(_recipient != address(0));
    require(allocations[_recipient].totalAllocated == 0 && _totalAllocated > 0); // Must be the first and only allocation for this recipient
    require(_recipient != companyWallet); // Receipient of presale allocation can't be company wallet

    uint cliff = 180 days;  // Cliff period = 6 months
    uint vesting = 1 years; // Vesting period = 1 year

    // Allocate
    AVAILABLE_PRESALE_SUPPLY = AVAILABLE_PRESALE_SUPPLY.sub(_totalAllocated);
    allocations[_recipient] = Allocation(uint8(AllocationType.PRESALE), startTime + cliff, startTime + vesting, _totalAllocated, 0);
    AVAILABLE_TOTAL_SUPPLY = AVAILABLE_TOTAL_SUPPLY.sub(_totalAllocated);
    LogNewAllocation(_recipient, AllocationType.PRESALE, _totalAllocated, grandTotalAllocated());
  }

  /**
   * @dev Transfer a recipients available allocation to their address
   * @param _recipient The address to withdraw tokens for
   */
 function transferTokens (address _recipient) public {
   require(now >= startTime); //Tokens can't be transfered until start date
   require(_recipient != companyWallet); // Tokens allocated to COMPANY can't be withdrawn.
   require(now >= allocations[_recipient].endCliff); // Cliff period must be ended
   // Receipient can't claim more IMB tokens than allocated
   require(allocations[_recipient].amountClaimed < allocations[_recipient].totalAllocated);

   uint256 newAmountClaimed;
   if (allocations[_recipient].endVesting > now) {
     // Transfer available amount based on vesting schedule and allocation
     newAmountClaimed = allocations[_recipient].totalAllocated.mul(now.sub(startTime)).div(allocations[_recipient].endVesting.sub(startTime));
   } else {
     // Transfer total allocated (minus previously claimed tokens)
     newAmountClaimed = allocations[_recipient].totalAllocated;
   }

   //Transfer
   uint256 tokensToTransfer = newAmountClaimed.sub(allocations[_recipient].amountClaimed);
   allocations[_recipient].amountClaimed = newAmountClaimed;
   require(INB.transfer(_recipient, tokensToTransfer));
   grandTotalClaimed = grandTotalClaimed.add(tokensToTransfer);
   LogINBClaimed(_recipient, allocations[_recipient].AllocationType, tokensToTransfer, newAmountClaimed, grandTotalClaimed);
 }

 /**
  * @dev Transfer INB tokens from Company allocation to reicipient address - Only owner and admins can execute
  * @param _recipient The address to transfer tokens for
  * @param _tokensToTransfer The amount of INB tokens to transfer
  */
 function manualContribution(address _recipient, uint _tokensToTransfer) public onlyOwnerOrAdmin {
   require(_recipient != address(0));
   require(_recipient != companyWallet); // Company can't withdraw tokens for itself
   require(_tokensToTransfer > 0); // The amount must be valid
   require(now >= startTime); // Tokens cant't be transfered until start date
   //Company can't trasnfer more tokens than allocated
   require(allocations[companyWallet].amountClaimed.add(_tokensToTransfer) <= allocations[companyWallet].totalAllocated);

   //Transfer
   allocations[companyWallet].amountClaimed = allocations[companyWallet].amountClaimed.add(_tokensToTransfer);
   require(INB.transfer(_recipient, _tokensToTransfer));
   grandTotalClaimed = grandTotalClaimed.add(_tokensToTransfer);
   LogINBClaimed(_recipient, uint8(AllocationType.COMPANY), _tokensToTransfer, allocations[companyWallet].amountClaimed, grandTotalClaimed);
 }

 /**
  * @dev Returns remaining Company allocation
  * @return Returns remaining Company allocation
  */
 function companyRemainingAllocation() public view returns (uint256) {
   return allocations[companyWallet].totalAllocated - allocations[companyWallet].amountClaimed;
 }

 /**
  * @dev Returns the amount of INB allocated
  * @return Returns the amount of INB allocated
  */
  function grandTotalAllocated() public view returns (uint256) {
    return INITIAL_SUPPLY - AVAILABLE_TOTAL_SUPPLY;
  }

  /**
   * @dev Admin management
   * @param _admin Address of the admin to modify
   * @param _allowed Status of the admin
   */
  function setAdmin(address _admin, bool _allowed) public onlyOwner {
      admins[_admin] = _allowed;
      SetAdmin(msg.sender,_admin,_allowed);
  }

  function refundTokens(address _token, address _refund, uint _value) onlyOwner {
    require(_token != address(INB));
    ERC20 token = ERC20(_token);
    token.transfer(_refund, _value);
    RefundTokens(_token, _refund, _value);
  }
}