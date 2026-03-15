// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract MerchantPrivacyPool {
    IERC20 public usdc;
    address public admin;
    mapping(bytes32 => uint256) public shieldedDeposits;

    constructor(address _usdcAddress, address _adminAddress) {
        usdc = IERC20(_usdcAddress);
        admin = _adminAddress;
    }

    // 1. The Listener (Admin) calls this to register the password hash
    function registerCommitment(bytes32 commitmentHash, uint256 amount) external {
        require(msg.sender == admin, "Only admin can register hashes");
        shieldedDeposits[commitmentHash] += amount;
    }

    // 2. The Merchant calls this from a BRAND NEW wallet to claim the USDC
    function anonymousWithdraw(string memory secret, address destinationWallet) external {
        // Re-hash the password to see if it matches the ledger
        bytes32 commitmentHash = keccak256(abi.encodePacked(secret));
        uint256 amount = shieldedDeposits[commitmentHash];
        
        require(amount > 0, "Invalid secret or no funds");

        // Zero out the balance so it can't be claimed twice
        shieldedDeposits[commitmentHash] = 0;
        
        // Transfer the actual USDC to the anonymous wallet
        require(usdc.transfer(destinationWallet, amount), "Transfer failed");
    }
}