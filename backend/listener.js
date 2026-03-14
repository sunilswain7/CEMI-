require('dotenv').config();
const { ethers } = require("ethers");
const { BitGo } = require("bitgo"); // Using the official SDK

// 1. Initialize BitGo for the Testnet Environment
const bitgo = new BitGo({ 
    env: 'test', 
    accessToken: process.env.BITGO_ACCESS_TOKEN 
});

// 2. Setup Ethers Provider & Contract
const PROVIDER_URL = "https://sepolia.base.org"; 
const CONTRACT_ADDRESS = "0xE480c32ae00C027452DB33727C5a3Fa9D982C2ce"; 
const ABI = [
  "event CheckoutCompleted(address indexed buyer, address indexed merchant, uint256 itemPrice, uint256 payoutAmount)"
];

const provider = new ethers.JsonRpcProvider(PROVIDER_URL, 84532);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

async function triggerBitGoPayout(buyer, merchant, amountUSDC) {
    console.log(`\n🏦 Initiating secure BitGo SDK transfer...`);
    
    try {
        // 1. Initialize the specific blockchain coin instance (Make sure this is 'hteth' in your .env!)
        const coin = bitgo.coin(process.env.BITGO_COIN);
        
        // 2. Fetch the wallet securely
        const wallet = await coin.wallets().get({ id: process.env.BITGO_WALLET_ID });
        const ETH_PRICE_IN_USD = 3000;
        
        // 2. Convert the USDC into ETH via Mock Oracle
        const amountETH = amountUSDC / ETH_PRICE_IN_USD;
        
        // 3. Convert the ETH into Wei (18 decimals) for BitGo
        const sendAmountWei = ethers.parseUnits(amountETH.toFixed(18), 18).toString();
        
        console.log(`Oracle Conversion: ${amountUSDC} USDC = ${amountETH} ETH`);
        console.log(`Sending ${sendAmountWei} Wei to Merchant: ${merchant}...`);
        console.log(`Routing ${amountUSDC} to Merchant: ${merchant}...`);

        // 3. Execute the official send command
        const transaction = await wallet.send({
            amount: sendAmountWei,
            address: merchant,
            walletPassphrase: process.env.BITGO_WALLET_PASSPHRASE
        });

        // Optional: Check if it hit the BitGo Enterprise Policy
        if (transaction.status === 'pendingApproval') {
            console.log(`🚨 BITGO POLICY TRIGGERED: Manual Admin Approval Required.`);
        } else {
            console.log(`✅ SUCCESS! Funds securely released via BitGo SDK.`);
        }
        
        console.log(`BitGo TxID: ${transaction.txid}\n`);

    } catch (error) {
        console.error(`⚠️ BitGo SDK Error:`, error.message);
    }
}

async function main() {
    console.log("🛰️ Production Watchtower active. Polling Base Sepolia...");
    let lastCheckedBlock = await provider.getBlockNumber();

    setInterval(async () => {
        try {
            const latestBlock = await provider.getBlockNumber();
            if (latestBlock > lastCheckedBlock) {
                const events = await contract.queryFilter("CheckoutCompleted", lastCheckedBlock + 1, latestBlock);
                
                for (const event of events) {
                    const [buyer, merchant, itemPrice, payoutAmount] = event.args;
                    const amountUSDC = parseFloat(ethers.formatUnits(payoutAmount, 6));
                    
                    console.log(`\n🚨 SECURE PURCHASE DETECTED 🚨`);
                    console.log(`Block: ${event.blockNumber}`);
                    console.log(`Buyer: ${buyer}`);
                    
                    // Trigger the production BitGo logic
                    await triggerBitGoPayout(buyer, merchant, amountUSDC);
                }
                lastCheckedBlock = latestBlock;
            }
        } catch (error) {
            console.log("RPC sync pending, retrying on next tick...");
        }
    }, 5000); 
}

main();