
// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "./PrizePoolBuilder.sol";
import "./SingleRandomWinnerBuilder.sol";
import "../comptroller/ComptrollerInterface.sol";
import "../prize-strategy/single-random-winner/SingleRandomWinnerProxyFactory.sol";
import "../prize-pool/compound/CompoundPrizePoolProxyFactory.sol";
import "../token/ControlledTokenProxyFactory.sol";
import "../token/TicketProxyFactory.sol";
import "../external/compound/CTokenInterface.sol";
import "../external/openzeppelin/OpenZeppelinProxyFactoryInterface.sol";

/// @title Builds new Compound Prize Pools
/* solium-disable security/no-block-members */
contract CompoundPrizePoolBuilder is PrizePoolBuilder {
  using SafeMath for uint256;
  using SafeCast for uint256;

  struct CompoundPrizePoolConfig {
    CTokenInterface cToken;
    uint256 maxExitFeeMantissa;
    uint256 maxTimelockDuration;
  }

  ComptrollerInterface public comptroller;
  CompoundPrizePoolProxyFactory public compoundPrizePoolProxyFactory;
  SingleRandomWinnerBuilder public singleRandomWinnerBuilder;
  address public trustedForwarder;

  constructor (
    ComptrollerInterface _comptroller,
    address _trustedForwarder,
    CompoundPrizePoolProxyFactory _compoundPrizePoolProxyFactory,
    SingleRandomWinnerBuilder _singleRandomWinnerBuilder
  ) public {
    require(address(_comptroller) != address(0), "CompoundPrizePoolBuilder/comptroller-not-zero");
    require(address(_singleRandomWinnerBuilder) != address(0), "CompoundPrizePoolBuilder/single-random-winner-builder-not-zero");
    require(address(_compoundPrizePoolProxyFactory) != address(0), "CompoundPrizePoolBuilder/compound-prize-pool-builder-not-zero");
    comptroller = _comptroller;
    singleRandomWinnerBuilder = _singleRandomWinnerBuilder;
    trustedForwarder = _trustedForwarder;
    compoundPrizePoolProxyFactory = _compoundPrizePoolProxyFactory;
  }

  function createSingleRandomWinner(
    CompoundPrizePoolConfig calldata prizePoolConfig,
    SingleRandomWinnerBuilder.SingleRandomWinnerConfig calldata prizeStrategyConfig,
    uint8 decimals
  ) external returns (CompoundPrizePool) {
    CompoundPrizePool prizePool = compoundPrizePoolProxyFactory.create();

    SingleRandomWinner prizeStrategy = singleRandomWinnerBuilder.createSingleRandomWinner(
      prizePool,
      prizeStrategyConfig,
      decimals,
      msg.sender
    );

    address[] memory tokens;

    prizePool.initialize(
      trustedForwarder,
      prizeStrategy,
      comptroller,
      tokens,
      prizePoolConfig.maxExitFeeMantissa,
      prizePoolConfig.maxTimelockDuration,
      prizePoolConfig.cToken
    );

    _setupSingleRandomWinner(
      prizePool,
      prizeStrategy,
      prizeStrategyConfig.ticketCreditRateMantissa,
      prizeStrategyConfig.ticketCreditLimitMantissa
    );

    prizePool.transferOwnership(msg.sender);

    emit PrizePoolCreated(msg.sender, address(prizePool), address(prizeStrategy));

    return prizePool;
  }

  function createCompoundPrizePool(
    CompoundPrizePoolConfig calldata config,
    PrizePoolTokenListenerInterface prizeStrategy
  )
    external
    returns (CompoundPrizePool)
  {
    CompoundPrizePool prizePool = compoundPrizePoolProxyFactory.create();

    address[] memory tokens;

    prizePool.initialize(
      trustedForwarder,
      prizeStrategy,
      comptroller,
      tokens,
      config.maxExitFeeMantissa,
      config.maxTimelockDuration,
      config.cToken
    );

    prizePool.transferOwnership(msg.sender);

    emit PrizePoolCreated(msg.sender, address(prizePool), address(prizeStrategy));

    return prizePool;
  }
}
