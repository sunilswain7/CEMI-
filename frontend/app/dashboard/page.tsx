'use client';

import { useState } from 'react';
import { useAccount, useEnsName, useReadContract, useWriteContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseUnits, formatUnits } from 'viem';
import { GATEWAY_ADDRESS, GATEWAY_ABI, USDC_ADDRESS, USDC_ABI } from '../lib/contracts'; 

export default function EmiDashboard() {
  const { address } = useAccount();
  const [payAmount, setPayAmount] = useState<string>(''); 
  const [status, setStatus] = useState<string>('');
  const [localDebt, setLocalDebt] = useState<number | null>(null); 

  // Fetch ENS Name (for the bounty!)
  const { data: ensName } = useEnsName({
    address,
    chainId: sepolia.id, 
  });

  // Fetch live loan data from your NEW deployed contract
  const { data: loanData, refetch } = useReadContract({
    address: GATEWAY_ADDRESS as `0x${string}`,
    abi: GATEWAY_ABI,
    functionName: 'activeLoans',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { writeContractAsync } = useWriteContract();

  const loan = loanData as [bigint, bigint, bigint, bigint, bigint, boolean] | undefined;
  const actualDebt = loan ? Number(formatUnits(loan[4], 6)) : 0;
  const remainingDebt = localDebt !== null ? localDebt : actualDebt;
  const isActive = loan ? loan[5] : false;

  const handleRepay = async () => {
    if (!payAmount || isNaN(Number(payAmount))) return;
    
    try {
      const amountWei = parseUnits(payAmount, 6);
      
      // STEP 1: Approve USDC
      setStatus('🔐 Approving USDC Transfer...');
      await writeContractAsync({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [GATEWAY_ADDRESS, amountWei],
      });

      // STEP 2: Execute Repayment via Smart Contract
      // The contract will automatically sweep to BitGo Admin Treasury if the loan hits 0!
      setStatus('🏦 Executing Repayment & Checking Vault Sweep...');
      const tx = await writeContractAsync({
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'repayLoan',
        args: [amountWei],
      });
      
      setStatus(`✅ Success! Tx Hash: ${tx}`);
      setPayAmount('');
      
      // STEP 3: Optimistic UI Update
      const newDebt = remainingDebt - Number(payAmount);
      setLocalDebt(newDebt);

      // STEP 4: THE ULTIMATE PROTOCOL FLEX (Debt hits 0)
      if (newDebt <= 0) {
          setStatus(`🏦 Loan Cleared! Protocol is shielding Merchant settlement...`);
          
          try {
            // HACKATHON: Grab the hash we saved during Merchant Setup (simulates database)
            const savedMerchantHash = localStorage.getItem('merchant_commitment_hash') || "0x2b9eb4cbf73eb446dde88c10550baaf2419f8604602f08579549f7e8006e84c9"; 
            
            // Trigger the backend to deposit funds into the Privacy Pool AND issue the ENS Subname
            const response = await fetch('/api/clear-loan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantHash: savedMerchantHash,
                    amountToSettle: 50, // Hardcoded for demo, normally derived from the item price
                    userAddress: address,
                    userEnsName: ensName // Pass ENS to dynamic subname minter!
                })
            });

            const data = await response.json();

            if (data.success) {
               setStatus(`🏆 Settlement Shielded! Issued ENS Trust Badge: ${data.issuedName || 'trusted.eth'}`);
            } else {
               setStatus(`⚠️ Repaid, but relayer caught an error: ${data.error}`);
            }
          } catch (err) {
            console.error("Relayer fetch error:", err);
            setStatus(`🏆 LOAN CLEARED! Check backend logs for privacy pool status.`);
          }

          // Trigger the dynamic identity badge to turn green instantly!
          localStorage.setItem(`repaid_${address}`, 'true'); 
          window.dispatchEvent(new Event('loanRepaid')); 
      }
      
    } catch (error) {
      console.error('Repayment failed:', error);
      setStatus('❌ Transaction failed or rejected.');
    }
  };

  if (!isActive && localDebt === null) {
    return (
      <div className="p-8 border rounded-xl bg-green-900/20 border-green-500/50 text-center mt-10">
        <h3 className="text-2xl font-bold text-green-400 mb-2">No Active Debt</h3>
        <p className="text-gray-300">Your credit is clear. You are eligible for Prime Tier ENS.</p>
      </div>
    );
  }

  return (
    <div className="p-8 border rounded-xl bg-gray-900 border-gray-700 mt-10 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">EMI Dashboard</h2>

      <div className="mb-6 p-4 bg-black rounded-lg border border-gray-800">
        <div className="flex justify-between items-center mb-2">
            <p className="text-gray-400 text-sm">Remaining Debt</p>
        </div>
        <p className="text-3xl font-mono text-purple-400 font-bold">
          {remainingDebt.toFixed(2)} USDC
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <input 
          type="number" 
          value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)}
          className="bg-black border border-gray-700 rounded-lg p-3 text-white font-mono focus:border-purple-500 outline-none"
          placeholder="Amount to pay (e.g. 10)"
          max={remainingDebt}
        />
        <button 
          onClick={handleRepay}
          disabled={!payAmount || Number(payAmount) <= 0}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          Execute Repayment
        </button>
        {status && (
          <div className="mt-2 p-3 bg-black border border-gray-800 rounded-lg">
             <p className="text-sm font-mono text-yellow-400 break-words">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}