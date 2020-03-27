/**
Copyright 2019 PoolTogether LLC

This file is part of PoolTogether.

PoolTogether is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation under version 3 of the License.

PoolTogether is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with PoolTogether.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity 0.6.4;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CTokenMock is Initializable {
    mapping(address => uint256) ownerTokenAmounts;
    address public underlying;

    uint256 __supplyRatePerBlock;

    function initialize (address _token, uint256 _supplyRatePerBlock) public initializer {
        require(_token != address(0), "token is not defined");
        underlying = _token;
        __supplyRatePerBlock = _supplyRatePerBlock;
    }

    function mint(uint256 amount) external returns (uint) {
        ownerTokenAmounts[msg.sender] = ownerTokenAmounts[msg.sender] + amount;
        require(IERC20(underlying).transferFrom(msg.sender, address(this), amount), "could not transfer tokens");
        return 0;
    }

    function getCash() external view returns (uint) {
        return IERC20(underlying).balanceOf(address(this));
    }

    function redeemUnderlying(uint256 requestedAmount) external returns (uint) {
        require(requestedAmount <= ownerTokenAmounts[msg.sender], "insufficient underlying funds");
        ownerTokenAmounts[msg.sender] = ownerTokenAmounts[msg.sender] - requestedAmount;
        require(IERC20(underlying).transfer(msg.sender, requestedAmount), "could not transfer tokens");
    }

    function reward(address account) external {
        ownerTokenAmounts[account] = (ownerTokenAmounts[account] * 120) / 100;
    }

    function rewardCustom(address account, uint256 amount) external {
        ownerTokenAmounts[account] = ownerTokenAmounts[account] + amount;
    }

    function balanceOfUnderlying(address account) external view returns (uint) {
        return ownerTokenAmounts[account];
    }

    function supplyRatePerBlock() external view returns (uint) {
        return __supplyRatePerBlock;
    }

    function setSupplyRateMantissa(uint256 _supplyRatePerBlock) external {
        __supplyRatePerBlock = _supplyRatePerBlock;
    }
}
