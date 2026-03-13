'use client';

import { useState } from 'react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import QRCode from 'react-qr-code';
import { useWriteContract } from 'wagmi';
import { ShieldCheck, X, Loader2 } from 'lucide-react';
import { GATEWAY_ADDRESS, GATEWAY_ABI } from '../lib/contracts';

interface ReclaimVerifierProps {
  onVerificationSuccess: () => void;
}

export default function ReclaimVerifier({ onVerificationSuccess }: ReclaimVerifierProps) {
  const [requestUrl, setRequestUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const startReclaimSession = async () => {
    try {
      setIsGenerating(true);
      
      const APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID!;
      const APP_SECRET = process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET!;
      const PROVIDER_ID = process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID!;

      const reclaimProofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
      const url = await reclaimProofRequest.getRequestUrl();
      setRequestUrl(url);
      setIsGenerating(false);

      await reclaimProofRequest.startSession({
        onSuccess: async (proofs: any) => {
            console.log('Proof received. Verifying on backend...');
            setRequestUrl(null); 
            setIsSubmittingTx(true);

            try {
                // 1. Send to your Next.js API route we made earlier
                const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proofs }),
                });

                const result = await response.json();

                if (result.success) {
                console.log('Backend verified! Now setting the on-chain flag...');
                
                // 2. Perform a TINY transaction that will NOT fail
                const tx = await writeContractAsync({
                    address: GATEWAY_ADDRESS as `0x${string}`,
                    abi: GATEWAY_ABI,
                    functionName: 'forceVerify', // Calling the simple function
                });
                
                console.log('On-chain flag set! Hash:', tx);
                onVerificationSuccess(); 
                }
            } catch (error) {
                console.error('Final attempt failed:', error);
                alert("Verification failed. Check console.");
            } finally {
                setIsSubmittingTx(false);
            }
            },
        onError: (error) => {
          console.error('Reclaim session error', error);
          setRequestUrl(null);
          setIsGenerating(false);
        },
      });
    } catch (error) {
      console.error('Failed to initialize Reclaim', error);
      setIsGenerating(false);
    }
  };

  return (
    <>
      <button 
        onClick={startReclaimSession}
        disabled={isGenerating || isSubmittingTx}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2"
      >
        {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : 
         isSubmittingTx ? "Submitting Proof to Base..." :
         <><ShieldCheck className="w-5 h-5" /> Verify Identity with Reclaim zkTLS</>}
      </button>

      {/* QR Code Modal Overlay */}
      {requestUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-sm w-full relative shadow-2xl">
            <button 
              onClick={() => setRequestUrl(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 text-center">Scan to Verify</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Use your phone's camera to prove your Zomato history securely.
            </p>
            <div className="bg-white p-4 rounded-xl flex justify-center">
              <QRCode value={requestUrl} size={200} />
            </div>
            <p className="text-xs text-gray-500 text-center mt-6 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Zero-Knowledge Proof
            </p>
          </div>
        </div>
      )}
    </>
  );
}