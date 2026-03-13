// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CheckoutGateway} from "../src/CheckoutGateway.sol";

contract Deploy is Script {
    function run() external {
        // 1. Load your Private Keys from the .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 aiAgentPrivateKey = vm.envUint("AI_AGENT_PRIVATE_KEY");

        // 2. Automatically derive the public wallet address for your AI Agent
        address aiAgentAddress = vm.addr(aiAgentPrivateKey);
        console.log("AI Agent Public Address:", aiAgentAddress);

        // 3. Official Base Sepolia Testnet Addresses
        // Mock USDC from Circle
        address USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; 
        
        // Aave V3 Pool
        address AAVE_POOL_BASE_SEPOLIA = 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27; 
        
        // Reclaim ZK Verifier (Replace with official Reclaim Base Sepolia Address if different in their docs!)
        address RECLAIM_VERIFIER = 0xF90085f5Fd1a3bEb8678623409b3811eCeC5f6A5; 

        // 4. Start broadcasting transactions to the live network!
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying CheckoutGateway...");
        
        CheckoutGateway gateway = new CheckoutGateway(
            USDC_BASE_SEPOLIA,
            AAVE_POOL_BASE_SEPOLIA,
            RECLAIM_VERIFIER,
            aiAgentAddress
        );

        console.log("CheckoutGateway deployed securely to:", address(gateway));

        vm.stopBroadcast();
    }
}