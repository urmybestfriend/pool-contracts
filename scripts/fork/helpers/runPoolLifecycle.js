const hardhat = require('hardhat')
const chalk = require("chalk")
const { increaseTime } = require('../../../test/helpers/increaseTime')

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

const { ethers } = hardhat

async function getPrizePoolAddressFromBuilderTransaction(tx) { 
  const ProxyFactory = await hardhat.artifacts.readArtifact('ProxyFactory')
  const proxyFactory = new ethers.utils.Interface(ProxyFactory.abi)
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return proxyFactory.parseLog(log) } catch (e) { return null } })
  const address = createResultEvents[0].args.proxy
  dim(`Found pool address at ${address}`)
  return address
}

async function runPoolLifecycle (prizePool, signer) {

  const token = await ethers.getContractAt('ERC20Upgradeable', await prizePool.token(), signer)
  const decimals = await token.decimals()
  const prizeStrategy = await ethers.getContractAt('MultipleWinners', await prizePool.prizeStrategy(), signer)
  const ticketAddress = await prizeStrategy.ticket()
  const ticket = await ethers.getContractAt('Ticket', ticketAddress, signer)

  const depositAmount = ethers.utils.parseUnits('1000', decimals)

  let tokenBalance = await token.balanceOf(signer._address)
  green(`token Holder starting token balance: ${ethers.utils.formatUnits(tokenBalance, decimals)}`)

  if (tokenBalance.lt(depositAmount)) {
    throw new Error('Signer has insufficient tokens')
  }

  dim(`Approving token spend for ${signer._address}...`)
  await token.approve(prizePool.address, depositAmount)
  dim(`Depositing into Pool with ${signer._address}, ${ethers.utils.formatUnits(depositAmount, decimals)}, ${ticketAddress} ${ethers.constants.AddressZero}...`)
  await prizePool.depositTo(signer._address, depositAmount, ticketAddress, ethers.constants.AddressZero)
  dim(`Withdrawing...`)
  const tokenBalanceBeforeWithdrawal = await token.balanceOf(signer._address)
  await prizePool.withdrawInstantlyFrom(signer._address, depositAmount, ticketAddress, depositAmount)
  const tokenDiffAfterWithdrawal = (await token.balanceOf(signer._address)).sub(tokenBalanceBeforeWithdrawal)
  dim(`Withdrew ${ethers.utils.formatUnits(tokenDiffAfterWithdrawal, decimals)} token`)

  // now there should be some prize
  await prizePool.captureAwardBalance()
  console.log(`Prize is now: ${ethers.utils.formatUnits(await prizePool.awardBalance(), decimals)} token`)

  await token.approve(prizePool.address, tokenDiffAfterWithdrawal)
  await prizePool.depositTo(signer._address, tokenDiffAfterWithdrawal, await prizeStrategy.ticket(), ethers.constants.AddressZero)

  let ticketBalance = await ticket.balanceOf(signer._address)

  green(`New ticket balance: ${ethers.utils.formatUnits(ticketBalance, decimals)}`)

  dim(`Starting award...`)
  await prizeStrategy.startAward()
  await increaseTime(1)
  dim(`Completing award...`)
  const awardTx = await prizeStrategy.completeAward()
  const awardReceipt = await ethers.provider.getTransactionReceipt(awardTx.hash)
  const awardLogs = awardReceipt.logs.map(log => { try { return prizePool.interface.parseLog(log) } catch (e) { return null }})
  const awarded = awardLogs.find(event => event && event.name === 'Awarded')

  if (awarded) {
    console.log(`Awarded ${ethers.utils.formatUnits(awarded.args.amount, decimals)} token`)
  } else {
    console.log(`No prizes`)
  }

  tokenBalance = await token.balanceOf(signer._address)
  ticketBalance = await ticket.balanceOf(signer._address)
  green(`New ticket balance is ${ethers.utils.formatUnits(ticketBalance, decimals)}`)

  await increaseTime(1000)

  await prizePool.withdrawInstantlyFrom(signer._address, ticketBalance, ticketAddress, ticketBalance)
  
  const tokenDiff = (await token.balanceOf(signer._address)).sub(tokenBalance)
  dim(`Amount withdrawn is ${ethers.utils.formatUnits(tokenDiff, decimals)}`)

}

module.exports = {
  getPrizePoolAddressFromBuilderTransaction,
  runPoolLifecycle
}