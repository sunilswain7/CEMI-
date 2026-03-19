'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt,useEnsName} from 'wagmi';
import { parseUnits } from 'viem';
import { ShieldCheck, Zap, Lock, Loader2 } from 'lucide-react';
import { GATEWAY_ADDRESS, GATEWAY_ABI, USDC_ADDRESS, USDC_ABI } from '../lib/contracts';
import ReclaimVerifier from './ReclaimVerifier';

export default function CheckoutCard() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<'verify' | 'approve' | 'checkout' | 'success'>('verify');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const itemPrice = 1; // $100
  const downpaymentPercent = 20; // 20%
  const downpaymentAmount = (itemPrice * downpaymentPercent) / 100; // $20
  const principal = itemPrice - downpaymentAmount; // $80
  const interest = principal * 0.05; // 5% flat fee = $4
  const totalRepayment = principal + interest; // $84

  const { writeContractAsync, isPending } = useWriteContract();

  const { data: isVerified } = useReadContract({
    address: GATEWAY_ADDRESS as `0x${string}`,
    abi: GATEWAY_ABI,
    functionName: 'isCreditVerified',
    args: [address as `0x${string}`],
  });

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, GATEWAY_ADDRESS],
  });

  const handleApproveUSDC = async () => {
    try {
      const tx = await writeContractAsync({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [GATEWAY_ADDRESS, parseUnits(downpaymentAmount.toString(), 6)],
      });
      console.log('USDC Approved:', tx);
      setStep('checkout');
    } catch (error) {
      console.error('Approval failed', error);
    }
  };

  const handleCheckout = async () => {
    try {
      const merchantAddress = "0x7890000000000000000000000000000000000000"; // Mock Merchant
      const tx = await writeContractAsync({
        address: GATEWAY_ADDRESS as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: 'initiateCheckout',
        args: [parseUnits(itemPrice.toString(), 6), merchantAddress, downpaymentPercent as unknown as bigint],
        gas: BigInt(2000000),
      });
      
      console.log('Checkout Completed:', tx);
      setStep('success');
    } catch (error) {
      console.error('Checkout failed', error);
    }
  };

  if (!mounted) return null; 

  if (!isConnected) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center backdrop-blur-sm">
        <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Wallet Disconnected</h3>
        <p className="text-gray-400">Please connect your wallet to access Paisa EMI.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 blur-3xl rounded-full pointer-events-none"></div>

      <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
        <Zap className="text-purple-500" />
        Checkout Summary
      </h2>

      {/* Dynamic Math Breakdown */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between text-gray-300">
          <span>Item Price</span>
          <span className="font-mono">${itemPrice}.00 USDC</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Downpayment ({downpaymentPercent}%)</span>
          <span className="font-mono text-purple-400">${downpaymentAmount}.00 USDC</span>
        </div>
        <div className="w-full h-px bg-gray-800 my-2"></div>
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Principal Loan</span>
          <span className="font-mono">${principal}.00</span>
        </div>
        <div className="flex justify-between text-gray-400 text-sm">
          <span>Protocol Interest (5%)</span>
          <span className="font-mono">${interest}.00</span>
        </div>
        <div className="flex justify-between text-white font-bold text-lg pt-2">
          <span>Future EMI Total</span>
          <span className="font-mono">${totalRepayment}.00 USDC</span>
        </div>
      </div>

      {/* Transaction Flow Engine */}
      <div className="space-y-3">
        {step === 'success' ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Purchase Successful!
          </div>
        ) : !isVerified ? (
          <ReclaimVerifier onVerificationSuccess={() => setStep('approve')} />
        ) : step === 'verify' || step === 'approve' ? (
          <button 
            onClick={handleApproveUSDC}
            disabled={isPending}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-4 rounded-xl font-bold transition-all border border-gray-600 flex justify-center items-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : '1. Approve 20 USDC'}
          </button>
        ) : (
          <button 
            onClick={handleCheckout}
            disabled={isPending}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(147,51,234,0.4)] flex justify-center items-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : '2. Execute Checkout'}
          </button>
        )}
      </div>
    </div>
  );
}