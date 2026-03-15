require('dotenv').config();
const { ethers } = require("ethers");
const { BitGo } = require("bitgo");
const crypto = require("crypto");

// 1. Initialize BitGo
const bitgo = new BitGo({ 
    env: 'test', 
    accessToken: process.env.BITGO_ACCESS_TOKEN 
});

// 2. Setup Ethers Provider & Contracts
const PROVIDER_URL = "https://sepolia.base.org"; 

// 🚨 UPDATE THESE 3 ADDRESSES
const CHECKOUT_GATEWAY = "0xE08781371003b61d6d648e6a489D7Afed3ADEFdE"; 
const PRIVACY_POOL_ADDRESS = "0x5509CD167814Af746D2799215B56F2A2592a5099";
const BITGO_VAULT_ONCHAIN_ADDRESS = "0x48096c657f2dca738b82460785d9ed695abedae6"; // Where the sweep goes!

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const GATEWAY_ABI = [
    "event CheckoutCompleted(address indexed buyer, address indexed merchant, uint256 itemPrice, uint256 payoutAmount)",
    "event LoanRepaid(address indexed buyer, uint256 amountRepaid)",
    "function sweepToTreasury(address bitgoVaultAddress, uint256 amount) external"
];
const POOL_ABI = ["function registerCommitment(bytes32 commitmentHash, uint256 amount) external"];
const USDC_ABI = ["function balanceOf(address account) external view returns (uint256)"];

const provider = new ethers.JsonRpcProvider(PROVIDER_URL, 84532);
const checkadminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);


const gatewayContract = new ethers.Contract(CHECKOUT_GATEWAY, GATEWAY_ABI, checkadminWallet);
const poolContract = new ethers.Contract(PRIVACY_POOL_ADDRESS, POOL_ABI, adminWallet);
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);

// --- BITGO PRIVACY PAYOUT (Fires on Checkout) ---
async function triggerPrivacyShield(buyer, merchant, payoutAmountUnits) {
    console.log(`\n🕵️  Initiating Upfront B2B Shielded Settlement...`);
    try {
        const rawSecret = `paisa_${crypto.randomBytes(4).toString('hex')}`;
        const commitmentHash = ethers.keccak256(ethers.toUtf8Bytes(rawSecret));

        console.log(`\n=================================================`);
        console.log(`🚨 SECURE PASSCODE GENERATED FOR MERCHANT`);
        console.log(`Raw Password:    ${rawSecret}`);
        console.log(`Locked Hash:     ${commitmentHash}`);
        console.log(`⚠️  COPY THE PASSWORD NOW! It will not be shown again.`);
        console.log(`=================================================\n`);

        console.log(`⏳ Step 1: Registering cryptographic commitment...`);
        const registerTx = await poolContract.registerCommitment(commitmentHash, payoutAmountUnits.toString());
        await registerTx.wait();
        console.log(`✅ Hash Registered! Tx: ${registerTx.hash}`);

        const coin = bitgo.coin('tbaseeth:usdc'); 
        const wallet = await coin.wallets().get({ id: process.env.BITGO_WALLET_ID });

        const displayAmount = payoutAmountUnits / 1e6;
        console.log(`🚀 Step 2: Routing ${displayAmount} USDC upfront to Privacy Pool from BitGo...`);

        const params = {
            recipients: [{ 
                amount: payoutAmountUnits.toString(), 
                address: PRIVACY_POOL_ADDRESS, 
                tokenName: 'tbaseeth:usdc'
            }],
            walletPassphrase: process.env.BITGO_WALLET_PASSPHRASE,
            tokenName: 'tbaseeth:usdc', 
            type: 'transfer',
        };

        const transaction = await wallet.sendMany(params);
        console.log(`✅ SUCCESS! Merchant Liquidity Shielded. BitGo TxID: ${transaction.txid}`);
    } catch (error) {
        console.error(`⚠️ Error shielding settlement:`, error.message);
    }
}

// --- GATEWAY AUTO-SWEEP (Fires on Repayment) ---
async function sweepGatewayToBitGo() {
    console.log(`\n🧹 Initiating Protocol Treasury Sweep...`);
    try {
        // 1. Check exactly how much USDC is sitting in the Gateway contract
        const balance = await usdcContract.balanceOf(CHECKOUT_GATEWAY);
        const displayBalance = ethers.formatUnits(balance, 6);
        
        if (balance > 0n) {
            console.log(`💰 Found ${displayBalance} USDC in Gateway. Sweeping to BitGo Vault...`);
            
            // 2. Call the new sweep function!
            const sweepTx = await gatewayContract.sweepToTreasury(BITGO_VAULT_ONCHAIN_ADDRESS, balance);
            await sweepTx.wait();
            
            console.log(`✅ SUCCESS! ${displayBalance} USDC securely returned to BitGo Treasury.`);
            console.log(`🔗 Sweep Tx Hash: ${sweepTx.hash}`);
        } else {
            console.log(`⚠️ Gateway is already empty. Nothing to sweep.`);
        }
    } catch (error) {
         console.error(`⚠️ Error sweeping treasury:`, error.message);
    }
}

// 🛑 The Loop-Breaker Flag
let isProcessing = false;

async function main() {
    console.log("🛰️ Closed-Loop Watchtower active. Polling Base Sepolia...");
    let lastCheckedBlock = await provider.getBlockNumber() - 1;

    setInterval(async () => {
        if (isProcessing) return; 

        try {
            isProcessing = true; 
            const latestBlock = await provider.getBlockNumber();
            
            if (latestBlock > lastCheckedBlock) {
                
                // --- SCENARIO 1: USER BUYS AN ITEM ---
                const checkoutEvents = await gatewayContract.queryFilter("CheckoutCompleted", lastCheckedBlock + 1, latestBlock);
                for (const event of checkoutEvents) {
                    const [buyer, merchant, itemPrice, payoutAmount] = event.args;
                    console.log(`\n🛒 NEW CHECKOUT DETECTED | Block: ${event.blockNumber}`);
                    
                    await triggerPrivacyShield(buyer, merchant, payoutAmount.toString());
                }

                // --- SCENARIO 2: USER PAYS OFF EMI ---
                const repayEvents = await gatewayContract.queryFilter("LoanRepaid", lastCheckedBlock + 1, latestBlock);
                for (const event of repayEvents) {
                    const [buyer, amountRepaid] = event.args;
                    console.log(`\n💳 EMI LOAN REPAID DETECTED | Block: ${event.blockNumber}`);
                    console.log(`User ${buyer} paid back ${ethers.formatUnits(amountRepaid, 6)} USDC.`);
                    
                    // Trigger the sweep!
                    await sweepGatewayToBitGo();
                }

                lastCheckedBlock = latestBlock; 
            }
        } catch (error) {
            console.log("RPC sync pending, retrying...");
        } finally {
            isProcessing = false; 
        }
    }, 5000); 
}

main();