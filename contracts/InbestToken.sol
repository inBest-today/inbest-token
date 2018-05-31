pragma solidity ^0.4.18;


import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';


/**
 * @title InbestToken
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `StandardToken` functions.
 */
contract InbestToken is StandardToken {

  string public constant name = "Inbest Token";
  string public constant symbol = "IBST";
  uint8 public constant decimals = 18;

  // TBD
  uint256 public constant INITIAL_SUPPLY = 17656263110 * (10 ** uint256(decimals));

  /**
   * @dev Constructor that gives msg.sender all of existing tokens.
   */
  function InbestToken() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
    Transfer(0x0, msg.sender, INITIAL_SUPPLY);
  }

}
