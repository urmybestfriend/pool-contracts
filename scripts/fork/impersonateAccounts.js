const hre = require("hardhat")


async function run(){
    const { getNamedAccounts } = hre
    const { deployer } = await getNamedAccounts()

    console.log("Impersonating accounts")
    await hre.ethers.provider.send("hardhat_impersonateAccount", ["0x0000000000000000000000000000000000000000"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x00929c5c2c4f00b540e429247669eb6fcd8b1dbf"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x029Aa20Dcc15c022b1b61D420aaCf7f179A9C73f"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x121b9c8c140fa8fe697cc96d156a38d865fa4868"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x1628ccf16b68c3c02e91427d6987ee72f1e730d8"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x19ea9301b7a47bd0a329723398d75013e7e9ced7"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x1af6bbd1a576eceaf53a394dcb99d49cc2063291"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x29ab95880437e417a1117ce76d6a5661604f09e6"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x2a08fecb8ac932cb7d3f6a3a0e434a4b9968dd56"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x2e6a6432e4ae0aff2b4a6143922a6aca7a6ca261"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x32075ff4f75241a6452f3b2794ef54e109991e4b"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x366401d0c187eb5194488cbcf4ff7ebe6b8b221f"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x42cd8312d2bce04277dd5161832460e95b24262e"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x432dcbda06e8b296ca29705572d7cb6315ed8bed"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x476e23bfc5415397021a74e525640b328a12b81e"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x50af5f78a48bfbb09d4a53263be9a405b4d39fec"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x50fc765a9bb5e13cacbb2c7ef6e467349468fd78"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x564286362092D8e7936f0549571a803B203aAceD"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x5761ab177fc7d38dcce87950111b34825217b54b"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x5811eb429b251baba201a2e3bec2a91d7577ab40"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x58f40a196d59a458a75478a2f9fc81ada5d5c710"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x5bd3592ff0416034c18c041a573fcada53ea0063"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x5Ff0F990137ED250c84C492a896cB3F980D0f6B9"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x625c7145fde1667f497b201dae06c3357078c388"])  
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x6e3b17c99ba205891ec1af6f376c8e771e7e6390"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x6e8322ef1bac2e80f62385e04011733e522cf9b3"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x77383badb05049806d53e9def0c8128de0d56d90"])      
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x7c7c13f1b16f3f979b7e1a1a9215e2e4e0bceaa8"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x7d0d8bf8e14a6b3237195b8d28a19a07252c6885"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x91aa26e956435c2c611a85d054f43a15eb880622"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x9C6EFFf83578a1049E91106F071A24Ba5313B9e9"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0x9d0e033bc36524080291d0d8b77a7c7547c17051"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xa38445311cCd04a54183CDd347E793F4D548Df3F"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xa5c3A513645A9a00cB561fED40438E9DFE0D6a69"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xB3152182472ba2E46B11C75440a72D087F0750B6"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xbb1a131e9c50f6016a1ed12c818646411979a565"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xC30756b3012b880AfcBF24BF239b72bBcA48636c"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xc4798b79d22630cee83b4ecb0fd98cd5ff0fbb62"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xd2ed8c5dac33ece7074b142fa4de69e6b4b82915"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xd868ecb3c67c5f77878d30deb89d3726da71f9e3"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xdaf1e6a92c2d62408aa5a3ea64d0fbedf440f6e0"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xde7670354fe2110fbf3a2ca269096647fc955924"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xe507F2d7dE97c783a60FeF9f1c4A4dade2b0a989"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xEc0286a4B478ECd600d3D96E398157B4825C5a38"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xf0011c2c975b6178b5139832369b0d981a493a08"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xf07024e8af5e4b440954336fba6a28c5fa5ab58a"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xf53a69e7b19d3a92ceae7efb9c621d01d5ab365a"])
    await hre.ethers.provider.send("hardhat_impersonateAccount",["0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8"])
console.log("finished impersonating accounts")
}
run()