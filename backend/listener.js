require('dotenv').config();
const { ethers } = require("ethers");
const { BitGo } = require("bitgo");

// 1. Initialize BitGo
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

async function triggerBitGoPayout(buyer, merchant, payoutAmountUnits) {
    console.log(`\n🏦 Initiating Pure Base Sepolia USDC Payout...`);
    
    try {
        const coin = bitgo.coin('tbaseeth:usdc'); 
        const wallet = await coin.wallets().get({ id: process.env.BITGO_WALLET_ID });

        const displayAmount = payoutAmountUnits / 1e6;
        
        console.log(`💰 Treasury USDC Balance: ${wallet.balanceString()} units`);
        console.log(`🚀 Routing ${displayAmount} USDC to Merchant: ${merchant}...`);

        // The BitGo Dev's exact working payload for ERC-20
        const params = {
            recipients: [{ 
                amount: payoutAmountUnits.toString(), 
                address: merchant,
                tokenName: 'tbaseeth:usdc'
            }],
            walletPassphrase: process.env.BITGO_WALLET_PASSPHRASE,
            tokenName: 'tbaseeth:usdc', 
            type: 'transfer',
        };

        const transaction = await wallet.sendMany(params);

        if (transaction.status === 'pendingApproval') {
            console.log(`🚨 BITGO POLICY TRIGGERED: Manual Admin Approval Required.`);
        } else {
            console.log(`✅ SUCCESS! BitGo TxID: ${transaction.txid}`);
        }

    } catch (error) {
        console.error(`⚠️ BitGo SDK Error:`, error.message);
    }
}

// 🛑 The Loop-Breaker Flag
let isProcessing = false;

async function main() {
    console.log("🛰️ Production Watchtower active. Polling Base Sepolia...");
    
    // Start scanning from the current block, minus 1 just to be safe
    let lastCheckedBlock = await provider.getBlockNumber() - 1;

    setInterval(async () => {
        // If we are currently handling a payout, don't run the interval again!
        if (isProcessing) return; 

        try {
            isProcessing = true; // Lock the process
            
            const latestBlock = await provider.getBlockNumber();
            
            if (latestBlock > lastCheckedBlock) {
                // Query only the blocks we haven't checked yet
                const events = await contract.queryFilter("CheckoutCompleted", lastCheckedBlock + 1, latestBlock);
                
                for (const event of events) {
                    const [buyer, merchant, itemPrice, payoutAmount] = event.args;
                    
                    console.log(`\n🚨 SECURE PURCHASE DETECTED 🚨`);
                    console.log(`Block: ${event.blockNumber} | Buyer: ${buyer}`);
                    
                    // Wait for the payout to finish before moving to the next event
                    await triggerBitGoPayout(buyer, merchant, payoutAmount.toString());
                }
                
                // Update the block tracker ONLY after all events in this range are handled
                lastCheckedBlock = latestBlock; 
            }
        } catch (error) {
            console.log("RPC sync pending, retrying...");
        } finally {
            // Unlock the process so the next interval can run
            isProcessing = false; 
        }
    }, 5000); 
}

main();