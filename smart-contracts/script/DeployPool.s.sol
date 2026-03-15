// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MerchantPrivacyPool} from "../src/PrivacyPool.sol";

contract DeployPrivacyPool is Script {
    function run() external {
        // Load the private key from your .env file
        uint256 deployerPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        
        // Automatically get the public address of your admin wallet
        address adminAddress = vm.addr(deployerPrivateKey);
        
        // Base Sepolia USDC Address
        address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract with the required constructor arguments
        MerchantPrivacyPool pool = new MerchantPrivacyPool(usdcAddress, adminAddress);

        vm.stopBroadcast();

        console.log("Privacy Pool Deployed to:", address(pool));
        console.log("Admin Address set to:", adminAddress);
    }
}