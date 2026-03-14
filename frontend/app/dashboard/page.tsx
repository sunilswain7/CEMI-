'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
// Make sure these point to your actual contract addresses and ABIs
import { GATEWAY_ADDRESS, GATEWAY_ABI, USDC_ADDRESS, USDC_ABI } from '../lib/contracts'; 

export default function EmiDashboard() {
  const { address } = useAccount();
  const [payAmount, setPayAmount] = useState<string>(''); 
  const [status, setStatus] = useState<string>('');

  // 1. Fetch live loan data from your deployed contract
  const { data: loanData, refetch, error } = useReadContract({
    address: GATEWAY_ADDRESS as `0x${string}`,
    abi: GATEWAY_ABI,
    functionName: 'activeLoans',
    args: address ? [address] : undefined, // Safety check
    query: {
      enabled: !!address, // Don't run until wallet is fully connected
    }
  });

  // 👇 ADD THIS TEMPORARY CONSOLE LOG 👇
  console.log("Current Wallet:", address);
  console.log("Raw Loan Data from Contract:", loanData);
  if (error) console.error("Wagmi Read Error:", error);

  const { writeContractAsync } = useWriteContract();

  // 1. Tell TypeScript the exact tuple structure coming from Solidity
  const loan = loanData as [bigint, bigint, bigint, bigint, bigint, boolean] | undefined;

  // 2. Safely extract the values without TypeScript panicking
  const remainingDebt = loan ? Number(formatUnits(loan[4], 6)) : 0;
  const isActive = loan ? loan[5] : false;

  const handleRepay = async () => {
    if (!payAmount || isNaN(Number(payAmount))) return;
    
    try {
      const amountWei = parseUnits(payAmount, 6);
      
      // Step 1: Approve the Gateway to take the USDC repayment
      setStatus('Approving USDC...');
      await writeContractAsync({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [GATEWAY_ADDRESS, amountWei],
      });

      // Step 2: Execute the Repayment
      setStatus('Executing Repayment...');
      const tx = await writeContractAsync({
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'repayLoan',
        args: [amountWei],
      });
      
      setStatus(`Success! Tx Hash: ${tx}`);
      setPayAmount('');
      
      // Refresh the UI to show the new lower debt
      setTimeout(() => refetch(), 3000); 
      
    } catch (error) {
      console.error('Repayment failed:', error);
      setStatus('Transaction failed or rejected.');
    }
  };

  // If they have no active loan, show the success state
  if (!isActive) {
    return (
      <div className="p-8 border rounded-xl bg-green-900/20 border-green-500/50 text-center">
        <h3 className="text-2xl font-bold text-green-400 mb-2">No Active Debt</h3>
        <p className="text-gray-300">Your credit is clear. You are eligible for Prime Tier ENS.</p>
      </div>
    );
  }

  // If they have debt, show the repayment interface
  return (
    <div className="p-8 border rounded-xl bg-gray-900 border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">EMI Dashboard</h2>

      <div className="mb-6 p-4 bg-black rounded-lg">
        <p className="text-gray-400 text-sm">Remaining Debt</p>
        <p className="text-3xl font-mono text-purple-400 font-bold">
          {remainingDebt.toFixed(2)} USDC
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <input 
          type="number" 
          value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white font-mono"
          placeholder="Amount to pay (e.g. 10)"
          max={remainingDebt}
        />
        <button 
          onClick={handleRepay}
          disabled={!payAmount || Number(payAmount) <= 0}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          Submit Payment
        </button>
        {status && <p className="text-sm text-yellow-400 mt-2">{status}</p>}
      </div>
    </div>
  );
}