pragma solidity ^0.5.0;

import "./IMoneyMarket.sol";
import "zos-lib/contracts/Initializable.sol";
import "openzeppelin-eth/contracts/token/ERC20/IERC20.sol";

contract MoneyMarketMock is Initializable, IMoneyMarket {
  IERC20 token;
  mapping(address => mapping(address => uint256)) ownerTokenAmounts;

  function initialize (address _token) initializer public {
    require(_token != address(0), "token is not defined");
    token = IERC20(_token);
  }

  function supply(address asset, uint amount) external returns (uint) {
    ownerTokenAmounts[msg.sender][asset] = amount;
    require(token.transferFrom(msg.sender, address(this), amount), "could not transfer tokens");
  }

  function withdraw(address asset, uint requestedAmount) external returns (uint) {
    require(token.transfer(msg.sender, requestedAmount), "could not transfer tokens");
  }

  function getSupplyBalance(address account, address asset) view external returns (uint) {
    return (ownerTokenAmounts[account][asset] * 120) / 100;
  }
}
