'use client';

import { useEffect, useState } from 'react';
import { useWriteContract, useAccount } from 'wagmi';
import { parseAbi } from 'viem';

// 🚨 UPDATE THIS: Paste the address of the NEW Privacy Pool you just deployed in Remix
const PRIVACY_POOL_ADDRESS = "0x5509CD167814Af746D2799215B56F2A2592a5099";

// Using parseAbi prevents the Wagmi/Viem string array crash
const PRIVACY_POOL_ABI = parseAbi([
  "function anonymousWithdraw(string secret, address destinationWallet)"
]);

export default function MerchantPrivacyPortal() {
  const { address } = useAccount();
  const [secret, setSecret] = useState('');
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
        setMounted(true);
    }, []);
  const { writeContractAsync, isPending } = useWriteContract();
  

  const handleWithdraw = async () => {
    if (!secret || !destination) {
      setStatus('⚠️ Please enter both the passcode and the destination wallet.');
      return;
    }

    try {
      setStatus('🔐 Verifying Zero-Knowledge Proof & Withdrawing...');
      
      const tx = await writeContractAsync({
        address: PRIVACY_POOL_ADDRESS as `0x${string}`,
        abi: PRIVACY_POOL_ABI,
        functionName: 'anonymousWithdraw',
        // .trim() prevents accidental spaces, 'as `0x${string}`' fixes TS errors
        args: [secret.trim(), destination.trim() as `0x${string}`], 
        gas: BigInt(200000), // Hardcoded gas bypasses estimation issues on custom hashes
      });

      setStatus(`✅ Shielded Withdrawal Successful! Tx: ${tx}`);
      setSecret('');
      
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      if (error.message && error.message.includes('Invalid secret')) {
        setStatus('❌ Failed: Invalid passcode or funds already claimed.');
      } else {
        setStatus('❌ Transaction failed or rejected by wallet.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            B2B Privacy Settlement
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Claim your shielded USDC to a completely anonymous wallet.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-8 space-y-6">
            
            {/* Warning Banner */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-400">OpSec Reminder</h3>
                  <div className="mt-2 text-sm text-purple-300">
                    <p>Make sure your MetaMask is currently connected to your <b>brand new, anonymous wallet</b> before executing this withdrawal.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Wallet Display */}
            <div>
              <label className="block text-sm font-medium text-gray-400">Current Connected Wallet</label>
              <div className="mt-1 p-3 bg-black rounded-md border border-gray-800 font-mono text-sm text-gray-500">
                {mounted ? (address || 'Not connected') : 'Loading wallet...'}
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Secure Passcode (From Terminal)
              </label>
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 block w-full bg-black border border-gray-700 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono"
                placeholder="paisa_a1b2c3d4..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Destination Wallet Address
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-1 block w-full bg-black border border-gray-700 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm font-mono"
                placeholder="0x..."
              />
              <p className="mt-1 text-xs text-gray-500">You can paste the same address you are connected with above.</p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleWithdraw}
              disabled={isPending || !secret || !destination}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Processing...' : 'Execute Shielded Withdrawal'}
            </button>

            {/* Status Output */}
            {status && (
              <div className={`mt-4 p-4 rounded-md border ${status.includes('❌') ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'bg-green-900/20 border-green-500/50 text-green-400'} font-mono text-sm break-all`}>
                {status}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}