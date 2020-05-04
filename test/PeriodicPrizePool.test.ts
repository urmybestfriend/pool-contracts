import { deployContract } from 'ethereum-waffle'
import MockInterestPool from '../build/MockInterestPool.json'
import MockPrizeStrategy from '../build/MockPrizeStrategy.json'
import PeriodicPrizePool from '../build/PeriodicPrizePool.json'
import ERC20Mintable from '../build/ERC20Mintable.json'
import ControlledToken from '../build/ControlledToken.json'
import Ticket from '../build/Ticket.json'
import { expect } from 'chai'
import { ethers } from './helpers/ethers'
import { increaseTime } from './helpers/increaseTime'
import buidler from './helpers/buidler'

const toWei = ethers.utils.parseEther

const debug = require('debug')('ptv3:PeriodicPrizePool.test')

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe('PeriodicPrizePool contract', () => {
  
  let prizePool: any
  let token: any
  let ticket: any
  let sponsorship: any
  let mockInterestPool: any
  let mockPrizeStrategy: any

  let wallet: any
  let allocator: any
  let otherWallet: any

  let startTime: any

  let prizePeriodSeconds: any

  const overrides = { gasLimit: 20000000 }

  beforeEach(async () => {
    [wallet, allocator, otherWallet] = await buidler.ethers.getSigners()

    prizePool = await deployContract(wallet, PeriodicPrizePool, [], overrides)
    token = await deployContract(wallet, ERC20Mintable, [], overrides)
    debug('Deploying MockPrizeStrategy...')
    mockPrizeStrategy = await deployContract(wallet, MockPrizeStrategy, [], overrides)
    mockInterestPool = await deployContract(wallet, MockInterestPool, [], overrides)
    debug('Deploying ControlledToken...')
    prizePeriodSeconds = 10

    debug('Deploying ControlledToken...')

    ticket = await deployContract(wallet, Ticket, [], overrides)
    await ticket.initialize(
      'Ticket',
      'TICK',
      prizePool.address
    )

    sponsorship = await deployContract(wallet, ControlledToken, [], overrides)
    await sponsorship.initialize(
      'Ticket',
      'TICK',
      prizePool.address
    )

    debug('Deploying ControlledToken...')

    await mockInterestPool.initialize(
      token.address
    )

    let tx = await prizePool['initialize(address,address,address,address,uint256)'](
      ticket.address,
      sponsorship.address,
      mockInterestPool.address,
      mockPrizeStrategy.address,
      prizePeriodSeconds
    )
    let block = await buidler.ethers.provider.getBlock(tx.blockHash)
    startTime = block.timestamp
    await token.mint(wallet._address, ethers.utils.parseEther('100000'))
  })

  describe('initialize()', () => {
    it('should set all the vars', async () => {
      expect(await prizePool.ticket()).to.equal(ticket.address)
      expect(await prizePool.interestPool()).to.equal(mockInterestPool.address)
      expect(await prizePool.distributionStrategy()).to.equal(mockPrizeStrategy.address)
      expect(await prizePool.currentPrizeStartedAt()).to.equal(startTime)
    })
  })

  describe('currentPrize()', () => {
    it('should return the available interest from the prize pool', async () => {
      await mockInterestPool.setBalanceOf(toWei('100'))
      expect(await prizePool.currentPrize()).to.equal(toWei('100'))
    })
  })

  describe('mintTickets()', () => {
    it('should create tickets', async () => {
      await token.approve(prizePool.address, toWei('10'))

      expect(await token.balanceOf(prizePool.address)).to.equal(toWei('0'))

      await prizePool.mintTickets(toWei('10'))

      debug('checking token balance')

      // underlying assets were moved to interestPool
      expect(await token.balanceOf(mockInterestPool.address)).to.equal(toWei('10'))
      
      debug('checking ticket balance')

      // ticket pool minted tickets for the depositor
      expect(await ticket.balanceOf(wallet._address)).to.equal(toWei('10'))
    })
  })

  describe('redeemTicketsInstantly()', () => {
    it('should allow a user to pay to redeem their tickets', async () => {
      await token.approve(prizePool.address, toWei('10'))
      await prizePool.mintTickets(toWei('10'))

      let userBalance = await token.balanceOf(wallet._address)

      // prize of 10
      await mockInterestPool.setBalanceOf(toWei('20')) 

      await increaseTime(prizePeriodSeconds)

      await prizePool.startAward()
      await prizePool.completeAward()

      debug(`checking previous prize...`)
    
      expect(await prizePool.previousPrize()).to.equal(toWei('10'))

      await increaseTime(4)

      await prizePool.redeemTicketsInstantly(toWei('10'))

      // tickets are burned
      expect(await ticket.totalSupply()).to.equal(toWei('0'))

      // user receives tokens less fee
      let fee = (await token.balanceOf(wallet._address)).sub(userBalance)
      
      // depending on timestamps, fee will be 5 or 6
      debug(`Fee is ${ethers.utils.formatEther(fee)}`)
      expect(fee.eq(toWei('4')) || fee.eq(toWei('6')) || fee.eq(toWei('5'))).to.be.true
    })
  })

  describe('redeemTicketsWithTimelock()', () => {
    it('should lock the users funds', async () => {
      await token.approve(prizePool.address, toWei('10'))
      await prizePool.mintTickets(toWei('10'))

      let startedAt = await prizePool.currentPrizeStartedAt()
      const unlockTimestamp = startedAt.toNumber() + 10

      await prizePool.redeemTicketsWithTimelock(toWei('10'))

      // Tickets are burned
      expect(await ticket.balanceOf(wallet._address)).to.equal('0')
      
      // Locked balance is recorded
      expect(await prizePool.lockedBalanceOf(wallet._address)).to.equal(toWei('10'))
      expect(await prizePool.lockedBalanceAvailableAt(wallet._address)).to.equal(unlockTimestamp)
    })


    it('should instantly redeem funds if unlockBlock is now or in the past', async () => {
      await token.approve(prizePool.address, toWei('10'))
      let tx = await prizePool.mintTickets(toWei('10'))

      // way beyond prize end
      await increaseTime(20)

      let userBalance = await token.balanceOf(wallet._address)
      tx = await prizePool.redeemTicketsWithTimelock(toWei('4'))
      // Tickets are transferred
      expect((await token.balanceOf(wallet._address)).sub(userBalance)).to.equal(toWei('4'))
      expect(await prizePool.lockedBalanceOf(wallet._address)).to.equal('0')
      expect(await prizePool.lockedBalanceAvailableAt(wallet._address)).to.equal('0')
    })

    it('should sweep old locked deposits', async () => {
      // create tickets
      await token.approve(prizePool.address, toWei('10'))
      await prizePool.mintTickets(toWei('10'))

      // mark balance less tickets
      let userBalance = await token.balanceOf(wallet._address)

      // now redeem tickets
      await prizePool.redeemTicketsWithTimelock(toWei('4'))

      // tickets should be burned
      expect(await ticket.balanceOf(wallet._address)).to.equal(toWei('6'))
    
      // now let's progress time so that the previous funds are unlocked
      await increaseTime(20)

      // redeem again
      await prizePool.redeemTicketsWithTimelock(toWei('6'))

      // Remaining tickets are burned
      expect(await ticket.balanceOf(wallet._address)).to.equal(toWei('0'))

      // All tokens should have been transferred
      expect((await token.balanceOf(wallet._address)).sub(userBalance)).to.equal(toWei('10'))

      // Locked balance is recorded
      expect(await prizePool.lockedBalanceOf(wallet._address)).to.equal(toWei('0'))
    })
  })

  describe('sweepUnlockedFunds()', () => {
    it('should return any timelocked funds that are now open', async () => {
      // deposit
      await token.approve(prizePool.address, toWei('4'))
      await prizePool.mintTickets(toWei('4'))

      let userBalance = await token.balanceOf(wallet._address)

      await prizePool.redeemTicketsWithTimelock(toWei('4'))

      expect(await prizePool.lockedBalanceAvailableAt(wallet._address)).to.equal(startTime + 10)

      // now progress time
      await increaseTime(10)

      await prizePool.sweepTimelockFunds([wallet._address])

      expect(await prizePool.lockedBalanceOf(wallet._address)).to.equal(toWei('0'))      

      expect((await token.balanceOf(wallet._address)).sub(userBalance)).to.equal(toWei('4'))
    })
  })

  describe('multiplyByRemainingTimeFraction()', () => {
    it('should calculate as a fraction of the time remaining', async () => {
      let remainingSeconds = (await prizePool.remainingSecondsToPrize()).toNumber()

      expect(await prizePool.multiplyByRemainingTimeFraction(toWei('1'))).to.equal(toWei('' + (remainingSeconds / prizePeriodSeconds)))

      // increment 4
      await increaseTime(4)

      remainingSeconds = (await prizePool.remainingSecondsToPrize()).toNumber()
      
      expect(await prizePool.multiplyByRemainingTimeFraction(toWei('1'))).to.equal(toWei('' + (remainingSeconds / prizePeriodSeconds)))
    })
  })

  describe('prizePeriodEndAt()', () => {
    it('should be correct', async () => {
      let start = (await prizePool.currentPrizeStartedAt()).toNumber()
      expect(await prizePool.prizePeriodEndAt()).to.equal(start + 10)
    })
  })

  describe('calculateExitFee(address, uint256 tickets)', () => {
    it('should calculate', async () => {
      // ensure there is interest
      await mockInterestPool.setBalanceOf(toWei('11'))
      
      // create tickets
      await token.approve(prizePool.address, toWei('10'))
      await prizePool.mintTickets(toWei('10'))
      
      await increaseTime(11)

      // award the prize.  will be 1 new ticket
      await prizePool.startAward()
      await prizePool.completeAward()

      debug('checking total sponsorship supply...')

      // The winnings became sponsorship
      expect(await sponsorship.totalSupply()).to.equal(toWei('1'))

      debug('calculating exit fee...')

      // now post-prize we want to check the fee.  Note that there are still only 10 tickets
      let exitFee = await prizePool.calculateExitFee(wallet._address, toWei('10'))
      
      let remainingSeconds = (await prizePool.remainingSecondsToPrize()).toNumber()
      let secs = (remainingSeconds / (prizePeriodSeconds*1.0))
      // console.log({secs})
      expect(exitFee).to.equal(toWei('' + secs))
    })
  })

  describe('calculateUnlockTimestamp(address, uint256)', () => {
    it('should calculate the prize period end', async () => {
      let start = (await prizePool.currentPrizeStartedAt()).toNumber()
      expect(await prizePool.calculateUnlockTimestamp(wallet._address, '0')).to.equal(start + 10)
    })
  })

  describe('estimatePrize()', () => {
    it('should calculate the prize', async () => {
      await mockInterestPool.setBalanceOf(toWei('1'))
      await token.approve(mockInterestPool.address, toWei('10'))
      await mockInterestPool.supply(toWei('10'))
      // should be current prize + estimated remaining
      expect(await prizePool.estimatePrize('1')).to.equal('1000000000000000045')
    })
  })

  describe('estimateRemainingPrize()', () => {
    it('should estimate the remaining prize', async () => {
      expect(await prizePool.estimateRemainingPrize()).to.equal('45')
    })
  })

  describe('estimateRemainingPrizeWithBlockTime(uint256)', () => { 
    it('should estimate the prize given the seconds per block', async () => {
      expect(await prizePool.estimateRemainingPrizeWithBlockTime(toWei('10'))).to.equal('45')
    })
  })

  describe('startAward()', () => {
    it('should not be called before the prize period is over', async () => {
      await expect(prizePool.startAward()).to.be.revertedWith('prize period not over')
    })

    it('should succeed without a winner', async () => {
      await increaseTime(11)
      await prizePool.startAward()
      await prizePool.completeAward()
      let block = await buidler.ethers.provider.getBlock('latest')
      // new prize period end block
      expect(await prizePool.prizePeriodEndAt()).to.equal(block.timestamp + 10)
    })

    it('should draw a winner and allocate prize', async () => {
      // ensure the wallet can be selected by depositing
      await token.approve(prizePool.address, toWei('10'))
      await prizePool.mintTickets(toWei('10'))

      await mockInterestPool.setBalanceOf(toWei('20'))

      await increaseTime(11)
      await prizePool.startAward()
      await prizePool.completeAward()
      let block = await buidler.ethers.provider.getBlock('latest')

      expect(await ticket.balanceOf(wallet._address)).to.equal(toWei('10'))
      
      // Ensure winnings have been minted as sponsorship
      expect(await sponsorship.balanceOf(prizePool.address)).to.equal(toWei('10'))
      // Ensure allowance has been made for strategy
      expect(await sponsorship.allowance(prizePool.address, mockPrizeStrategy.address)).to.equal(toWei('10'))

      // new prize period end block
      expect(await prizePool.prizePeriodEndAt()).to.equal(block.timestamp + 10)
    })
  })
})
