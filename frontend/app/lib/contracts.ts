// app/lib/contracts.ts

export const GATEWAY_ADDRESS = "0xB24e55F0ef885AC221252E03a260f847775c3B6b";
export const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const GATEWAY_ABI = [
  {
    "type": "function",
    "name": "initiateCheckout",
    "inputs": [
      { "name": "itemPrice", "type": "uint256" },
      { "name": "merchant", "type": "address" },
      { "name": "customDownPaymentPercent", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifyCreditScore",
    "inputs": [
      {
        "name": "proof",
        "type": "tuple",
        "components": [
          { "name": "claimInfo", "type": "string" },
          { "name": "signedClaim", "type": "string" }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isCreditVerified",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "forceVerify",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

export const USDC_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
];