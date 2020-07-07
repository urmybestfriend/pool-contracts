const { deployContract, deployMockContract } = require('ethereum-waffle')
const CompoundPrizePoolHarness = require('../build/CompoundPrizePoolHarness.json')
const ComptrollerInterface = require('../build/ComptrollerInterface.json')
const ControlledToken = require('../build/ControlledToken.json')
const CTokenInterface = require('../build/CTokenInterface.json')
const IERC20 = require('../build/IERC20.json')

const { ethers } = require('./helpers/ethers')
const { expect } = require('chai')
const buidler = require('./helpers/buidler')
const getIterable = require('./helpers/iterable')

const toWei = ethers.utils.parseEther
const toBytes = ethers.utils.toUtf8Bytes
const now = () => Math.floor((new Date()).getTime() / 1000)

const debug = require('debug')('ptv3:PrizePool.test')

let overrides = { gasLimit: 20000000 }

const FORWARDER = '0x5f48a3371df0F8077EC741Cc2eB31c84a4Ce332a'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('PrizePool contract', function() {
  let wallet, wallet2

  let prizePool, token, comptroller, cToken

  beforeEach(async () => {
    [wallet, wallet2] = await buidler.ethers.getSigners()
    debug(`using wallet ${wallet._address}`)

    debug('mocking tokens...')
    token = await deployMockContract(wallet, IERC20.abi, overrides)
    cToken = await deployMockContract(wallet, CTokenInterface.abi, overrides)
    await cToken.mock.underlying.returns(token.address)

    comptroller = await deployMockContract(wallet, ComptrollerInterface.abi, overrides)

    prizePool = await deployContract(wallet, CompoundPrizePoolHarness, [], overrides)

    ticket = await deployMockContract(wallet, ControlledToken.abi, overrides)
    await ticket.mock.controller.returns(prizePool.address)
    
    debug('deploying CompoundPrizePoolHarness...')

    await prizePool.initialize(
      FORWARDER,
      comptroller.address,
      [ticket.address],
      cToken.address
    )
  })

  describe('depositTo()', () => {
    it('should mint timelock tokens to the user', async () => {
      const amount = toWei('11')

      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      await token.mock.transferFrom.withArgs(wallet._address, prizePool.address, amount).returns(true)
      await token.mock.approve.withArgs(cToken.address, amount).returns(true)
      await cToken.mock.mint.withArgs(amount).returns('0')
      await comptroller.mock.afterDepositTo.withArgs(wallet2._address, amount, ticket.address).returns()
      await ticket.mock.controllerMint.withArgs(wallet2._address, amount).returns()

      // Test depositTo
      await expect(prizePool.depositTo(wallet2._address, amount, ticket.address))
        .to.emit(prizePool, 'Deposited')
        .withArgs(wallet._address, wallet2._address, ticket.address, amount)

    })
  })

  describe('withdrawInstantlyFrom()', () => {
    it('should allow a user to withdraw instantly', async () => {
      let amount = toWei('11')

      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      await comptroller.mock.calculateInstantWithdrawalFee.withArgs(wallet._address, amount, ticket.address).returns(toWei('1'))
      await ticket.mock.controllerBurnFrom.withArgs(wallet._address, wallet._address, amount).returns()
      await cToken.mock.redeemUnderlying.withArgs(toWei('10')).returns('0')
      await token.mock.transfer.withArgs(wallet._address, toWei('10')).returns(true)
      await comptroller.mock.afterWithdrawInstantlyFrom.withArgs(wallet._address, wallet._address, amount, ticket.address, toWei('1'), '0').returns()

      await expect(prizePool.withdrawInstantlyFrom(wallet._address, amount, ticket.address, '0'))
        .to.emit(prizePool, 'InstantWithdrawal')
        .withArgs(wallet._address, wallet._address, ticket.address, amount, toWei('1'), '0')
    })
  })

  describe('withdrawWithTimelockFrom()', () => {
    it('should work', async () => {
      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      // force current time
      await prizePool.setCurrentTime('1')

      // ensure withdraw is later than now
      await comptroller.mock.calculateWithdrawalUnlockTimestamp
        .withArgs(wallet._address, toWei('10'), ticket.address)
        .returns(10)

      // expect a ticket burn
      await ticket.mock.controllerBurnFrom.withArgs(wallet._address, wallet._address, toWei('10')).returns()

      // expect finish
      await comptroller.mock.afterWithdrawWithTimelockFrom.withArgs(wallet._address, toWei('10'), ticket.address).returns()

      // setup timelocked withdrawal
      await prizePool.withdrawWithTimelockFrom(wallet._address, toWei('10'), ticket.address)

      expect(await prizePool.timelockBalanceOf(wallet._address)).to.equal(toWei('10'))
      expect(await prizePool.timelockBalanceAvailableAt(wallet._address)).to.equal('10')
      expect(await prizePool.timelockTotalSupply()).to.equal(toWei('10'))
    })
  })

  describe('sweepTimelockBalances()', () => {
    it('should do nothing when no balances are available', async () => {
      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      // now execute timelock withdrawal
      await expect(prizePool.sweepTimelockBalances([wallet._address]))
        .not.to.emit(prizePool, 'TimelockedWithdrawalSwept')
        .withArgs(wallet._address, wallet._address, toWei('10'))
    })

    it('should sweep only balances that are unlocked', async () => {
      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      // force current time
      await prizePool.setCurrentTime('1')

      // expect ticket burns from both
      await ticket.mock.controllerBurnFrom.returns()

      debug('GOT HERE 1')

      // withdraw for a user, and it's eligible at 10 seconds
      await comptroller.mock.calculateWithdrawalUnlockTimestamp.returns(10)
      await comptroller.mock.afterWithdrawWithTimelockFrom.withArgs(wallet._address, toWei('11'), ticket.address).returns()
      await prizePool.withdrawWithTimelockFrom(wallet._address, toWei('11'), ticket.address)

      debug('GOT HERE 2')

      // withdraw for a user, and it's eligible at 20 seconds
      await comptroller.mock.calculateWithdrawalUnlockTimestamp.returns(20)
      await comptroller.mock.afterWithdrawWithTimelockFrom.withArgs(wallet2._address, toWei('22'), ticket.address).returns()
      await prizePool.withdrawWithTimelockFrom(wallet2._address, toWei('22'), ticket.address)

      // Only first deposit is unlocked
      await prizePool.setCurrentTime('15')

      debug('GOT HERE 3')

      // expect the redeem && transfer for only the unlocked amount
      await cToken.mock.redeemUnderlying.withArgs(toWei('11')).returns('0')
      await token.mock.transfer.withArgs(wallet._address, toWei('11')).returns(true)
      await comptroller.mock.afterSweepTimelockedWithdrawal.withArgs(wallet._address, wallet._address, toWei('11')).returns()

      debug('GOT HERE 4')

      // Let's sweep
      let result = await prizePool.sweepTimelockBalances([wallet._address, wallet2._address])

      await expect(Promise.resolve(result))
        .to.emit(prizePool, 'TimelockedWithdrawalSwept')
        .withArgs(wallet._address, wallet._address, toWei('11'))

      // first user has cleared
      expect(await prizePool.timelockBalanceOf(wallet._address)).to.equal(toWei('0'))
      expect(await prizePool.timelockBalanceAvailableAt(wallet._address)).to.equal('0')

      // second has not
      expect(await prizePool.timelockBalanceOf(wallet2._address)).to.equal(toWei('22'))
      expect(await prizePool.timelockBalanceAvailableAt(wallet2._address)).to.equal('20')

      expect(await prizePool.timelockTotalSupply()).to.equal(toWei('22'))
    })

    it('should sweep timelock balances that have unlocked', async () => {
      // updateAwardBalance
      await cToken.mock.balanceOfUnderlying.returns('0')
      await ticket.mock.totalSupply.returns('0')

      // force current time
      await prizePool.setCurrentTime('1')

      // ensure withdraw is later than now
      await comptroller.mock.calculateWithdrawalUnlockTimestamp
        .withArgs(wallet._address, toWei('10'), ticket.address)
        .returns(10)

      // expect a ticket burn
      await ticket.mock.controllerBurnFrom.withArgs(wallet._address, wallet._address, toWei('10')).returns()

      // expect finish
      await comptroller.mock.afterWithdrawWithTimelockFrom.withArgs(wallet._address, toWei('10'), ticket.address).returns()

      // setup timelocked withdrawal
      await prizePool.withdrawWithTimelockFrom(wallet._address, toWei('10'), ticket.address)

      // expect the redeem && transfer
      await cToken.mock.redeemUnderlying.withArgs(toWei('10')).returns('0')
      await token.mock.transfer.withArgs(wallet._address, toWei('10')).returns(true)
      await comptroller.mock.afterSweepTimelockedWithdrawal.withArgs(wallet._address, wallet._address, toWei('10')).returns()

      // ensure time is after
      await prizePool.setCurrentTime('11')

      // now execute timelock withdrawal
      await expect(prizePool.sweepTimelockBalances([wallet._address]))
        .to.emit(prizePool, 'TimelockedWithdrawalSwept')
        .withArgs(wallet._address, wallet._address, toWei('10'))

      expect(await prizePool.timelockBalanceOf(wallet._address)).to.equal('0')
      expect(await prizePool.timelockBalanceAvailableAt(wallet._address)).to.equal('0')
    })
  })
});