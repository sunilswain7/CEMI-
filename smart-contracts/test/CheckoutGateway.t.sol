// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CheckoutGateway, Proof} from "../src/CheckoutGateway.sol";

// --- MOCK CONTRACTS FOR LOCAL TESTING ---

// 1. Mock USDC Token
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[sender] >= amount, "ERC20: insufficient balance");
        require(allowance[sender][msg.sender] >= amount, "ERC20: insufficient allowance");
        balanceOf[sender] -= amount;
        allowance[sender][msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "ERC20: insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }
}

// 2. Mock Aave Pool
contract MockAavePool {
    uint256 public totalSupplied;
    function supply(address, uint256 amount, address, uint16) external {
        totalSupplied += amount;
    }
}

// 3. Mock Reclaim Verifier
contract MockReclaimVerifier {
    bool public shouldPass = true;
    function setShouldPass(bool _status) external { shouldPass = _status; }
    function verifyProof(Proof memory) external view returns (bool) { return shouldPass; }
}

// --- THE ACTUAL TEST SUITE ---

contract CheckoutGatewayTest is Test {
    CheckoutGateway public gateway;
    MockUSDC public usdc;
    MockAavePool public aave;
    MockReclaimVerifier public reclaim;

    address public admin = address(this);
    address public aiAgent = address(0x123); // Fake AI Wallet
    address public buyer = address(0x456);   // Fake User Wallet
    address public merchant = address(0x789); // Fake Merchant Store

    uint256 constant ITEM_PRICE = 100 * 10**6; // $100 USDC (6 decimals)
    uint256 constant STARTING_BALANCE = 500 * 10**6; // Give buyer $500 to start

    function setUp() public {
        // 1. Deploy Mocks
        usdc = new MockUSDC();
        aave = new MockAavePool();
        reclaim = new MockReclaimVerifier();

        // 2. Deploy your actual contract
        gateway = new CheckoutGateway(address(usdc), address(aave), address(reclaim), aiAgent);

        // 3. Setup the Buyer
        usdc.mint(buyer, STARTING_BALANCE);
        
        // Buyer approves the Gateway to take their USDC
        vm.prank(buyer);
        usdc.approve(address(gateway), type(uint256).max);
    }

    // ==========================================
    // 🧪 1. RECLAIM ZK PROOF TESTS
    // ==========================================

    function test_VerifyCreditScore_Success() public {
        vm.prank(buyer);
        // User has 50 Zomato orders (Valid!)
        gateway.verifyCreditScore(Proof('{"orders":[{"id":"1"}]}', "0xSignature"));
        assertTrue(gateway.isCreditVerified(buyer));
    }

    function test_VerifyCreditScore_RevertsIfZeroOrders() public {
        vm.prank(buyer);
        // User has 0 Zomato orders (Bouncer should block!)
        vm.expectRevert("Bouncer says NO: Must have > 0 orders");
        gateway.verifyCreditScore(Proof('{"orders":[]}', "0xSignature"));
    }

    function test_VerifyCreditScore_RevertsIfProofFake() public {
        reclaim.setShouldPass(false); // Tell mock to reject proof
        
        vm.prank(buyer);
        vm.expectRevert("ZK Proof is mathematically invalid");
        gateway.verifyCreditScore(Proof("fakeData", "fakeSig"));
    }

    // ==========================================
    // 🧪 2. CHECKOUT & MATH TESTS
    // ==========================================

    function test_InitiateCheckout_SuccessAndMathIsPerfect() public {
        // 1. Verify user first
        vm.prank(buyer);
        gateway.verifyCreditScore(Proof('{"orders":[{"id":"1"}]}', "0xSignature"));

        // 2. Do checkout (20% downpayment on $100 = $20)
        vm.prank(buyer);
        gateway.initiateCheckout(ITEM_PRICE, merchant, 20);

        // 3. Verify the math saved in the contract
        (
            uint256 totalItemPrice,
            uint256 downPayment,
            uint256 principalLoan,
            uint256 interestFee,
            uint256 remainingDebt,
            bool isActive
        ) = gateway.activeLoans(buyer);

        assertEq(totalItemPrice, 100 * 10**6);
        assertEq(downPayment, 20 * 10**6); 
        assertEq(principalLoan, 80 * 10**6); 
        assertEq(interestFee, 4 * 10**6); // 5% of 80 = 4
        assertEq(remainingDebt, 84 * 10**6); // 80 + 4 = 84
        assertTrue(isActive);

        // Verify Gateway actually holds the $20
        assertEq(usdc.balanceOf(address(gateway)), 20 * 10**6);
    }

    function test_InitiateCheckout_RevertsIfNotVerified() public {
        vm.prank(buyer);
        vm.expectRevert("Must verify credit via zkTLS");
        gateway.initiateCheckout(ITEM_PRICE, merchant, 20);
    }

    function test_InitiateCheckout_RevertsIfDownpaymentTooLow() public {
        vm.prank(buyer);
        gateway.verifyCreditScore(Proof('{"orders":[{"id":"1"}]}', "0xSignature"));

        vm.prank(buyer);
        vm.expectRevert("Minimum 10% downpayment required");
        gateway.initiateCheckout(ITEM_PRICE, merchant, 5); // Tries 5% down
    }

    // ==========================================
    // 🧪 3. AI AGENT YIELD TESTS
    // ==========================================

    function test_RouteFundsToAave_Success() public {
        // Get $20 into the contract first via a checkout
        test_InitiateCheckout_SuccessAndMathIsPerfect();

        // The AI Agent logs in and routes the funds!
        vm.prank(aiAgent);
        gateway.routeFundsToAave(20 * 10**6);

        // Verify the AI got its 0.50 USDC commission
        assertEq(usdc.balanceOf(aiAgent), 100000); 

        // Verify the remaining $19.50 went to Aave
        assertEq(aave.totalSupplied(), 19900000); 
    }

    function test_RouteFundsToAave_RevertsIfHackerTriggers() public {
        test_InitiateCheckout_SuccessAndMathIsPerfect();

        // Random user tries to steal the AI's job
        address hacker = address(0x999);
        vm.prank(hacker);
        vm.expectRevert("Unauthorized access");
        gateway.routeFundsToAave(20 * 10**6);
    }

    // ==========================================
    // 🧪 4. REPAYMENT TESTS
    // ==========================================

    function test_RepayLoan_FlexibleInstallments() public {
        test_InitiateCheckout_SuccessAndMathIsPerfect();
        // Debt is currently 84 USDC. 

        // 1. User pays off $40 (Partial installment)
        vm.prank(buyer);
        gateway.repayLoan(40 * 10**6);
        
        (,,,, uint256 remainingDebt, bool isActive) = gateway.activeLoans(buyer);
        assertEq(remainingDebt, 44 * 10**6);
        assertTrue(isActive); // Loan is still active

        // 2. User pays off the remaining $44
        vm.prank(buyer);
        gateway.repayLoan(44 * 10**6);

        (,,,, remainingDebt, isActive) = gateway.activeLoans(buyer);
        assertEq(remainingDebt, 0);
        assertFalse(isActive); // Loan is closed!
    }

    function test_RepayLoan_RevertsIfOverpaying() public {
        test_InitiateCheckout_SuccessAndMathIsPerfect();
        // Debt is 84 USDC. 

        vm.prank(buyer);
        vm.expectRevert("Overpaying loan");
        gateway.repayLoan(100 * 10**6); // User accidentally tries to pay $100
    }
}