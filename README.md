# CEMI 🛡️
**Decentralized, ZK Credit & B2B Privacy Pools**

CEMI is a Web3 Buy Now, Pay Later (BNPL) protocol built on **Base**. It bridges the gap between traditional finance utility and DeFi principles by enabling trustless, undercollateralized credit for users, while providing institutional-grade financial privacy and automated yield generation for merchants.

## 🌍 The Problem
The traditional BNPL industry is a multi-billion dollar market, but it is fundamentally incompatible with the current state of Web3:
1. **The Overcollateralization Trap:** Standard DeFi lending requires users to lock up 150%+ in collateral, making retail credit impossible for everyday users without doxxing themselves to a centralized entity.
2. **Corporate Espionage:** If a Web2 merchant adopts crypto payments on a public ledger, their entire cash flow and treasury become public. Competitors can trace their exact revenue, halting B2B enterprise adoption.
3. **Idle Liquidity:** In traditional BNPL, merchants wait weeks for EMIs to settle, letting capital sit idle against inflation.

## 💡 The Solution
CEMI introduces a closed-loop credit economy that solves these friction points through a combination of cutting-edge cryptography and DeFi primitives.

* **Undercollateralized Credit via zkTLS:** We utilize the **Reclaim Protocol** to securely verify off-chain financial data (like Web2 bank statements). Users prove they are creditworthy to our smart contracts *without* revealing their actual identity or raw banking data.
* **B2B Privacy Pools via BitGo:** To protect merchant revenue, we built an off-chain relayer architecture powered by **BitGo MPC Wallets**. EMI payments are routed through a shielded pool, breaking the public on-chain link between the consumer and the merchant's final settlement address.
* **Automated Yield Routing:** Escrowed downpayments are automatically deployed into **Aave**. While the merchant waits for the user to finish their EMI schedule, their locked capital generates continuous, risk-minimized yield.

## ⚙️ System Architecture

1. **Verification Phase:** User connects their wallet and generates a zkTLS proof of their Web2 financial status via Reclaim.
2. **Checkout Phase:** Upon successful verification, the smart contract allows the user to checkout with a fractional downpayment (e.g., 10%) on **Base Sepolia**.
3. **Yield Phase:** The gateway contract routes the locked downpayment into Aave to begin generating interest.
4. **Settlement Phase (Relayer):** A secure off-chain Node.js relayer (`listener.js`) monitors the blockchain for repayment events. Upon EMI completion, the relayer triggers the **BitGo API** to execute an MPC-secured payout to the merchant's private treasury.

## 🛠️ Tech Stack
* **Network:** Base Sepolia (High-speed, low-fee settlement layer)
* **Zero-Knowledge Proofs:** Reclaim Protocol (zkTLS)
* **Institutional Privacy:** BitGo SDK & MPC Wallets
* **DeFi Yield:** Aave V3
* **Frontend:** Next.js, Wagmi, Viem, TailwindCSS
* **Smart Contracts:** Solidity

## 🚧 Challenges Overcome
* **Smart Contracts Cannot Keep Secrets:** We recognized that executing MPC signatures on-chain would expose enterprise API keys. We engineered an event-driven off-chain Relayer (`listener.js`) to act as a secure bridge between public Base Sepolia events and BitGo's private institutional vaults.
* **BitGo Base Sepolia Integration:** Standard SDKs lacked streamlined support for the specific Base Sepolia testnet (`tbaseeth`). We collaborated directly with BitGo engineers to manually override network provider settings and successfully route our B2B privacy pools.

## 💻 Local Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/CEMI.git](https://github.com/yourusername/CEMI.git)
cd CEMI
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_GATEWAY_CONTRACT_ADDRESS=your_contract_address
```

Run the frontend:
```bash
npm run dev
```

### 3. Backend (Relayer) Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
BITGO_ACCESS_TOKEN=your_enterprise_token
BITGO_WALLET_ID=your_wallet_id
RPC_URL=[https://sepolia.base.org](https://sepolia.base.org)
PRIVATE_KEY=your_relayer_private_key
```

Run the relayer:
```bash
node listener.js
```