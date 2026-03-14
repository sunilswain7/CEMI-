'use client';

import { useAccount, useEnsName, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { GATEWAY_ADDRESS, GATEWAY_ABI } from '../lib/contracts';
import { ShieldCheck, User } from 'lucide-react';

export default function UserIdentityBadge() {
  const { address } = useAccount();

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id, 
  });

  const { data: loanData } = useReadContract({
    address: GATEWAY_ADDRESS as `0x${string}`,
    abi: GATEWAY_ABI,
    functionName: 'activeLoans',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const loan = loanData as [bigint, bigint, bigint, bigint, bigint, boolean] | undefined;
  const isActiveLoan = loan ? loan[5] : false;

  const baseIdentity = ensName || `${address?.slice(0, 6)}...${address?.slice(-4)}`;

  return (
    <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg shadow-sm">
      {isActiveLoan ? (
        <>
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm font-medium text-gray-300">
            {baseIdentity}
          </span>
        </>
      ) : (
        <>
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className="font-mono text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
            prime.{baseIdentity}
          </span>
        </>
      )}
    </div>
  );
}