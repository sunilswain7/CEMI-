import { useAccount, useEnsName, useReadContract } from 'wagmi';

import { sepolia } from 'wagmi/chains';

import { GATEWAY_ADDRESS, GATEWAY_ABI } from '../lib/contracts';

import { ShieldCheck, User, AlertCircle, CheckCircle2 } from 'lucide-react';

import { useState, useEffect } from 'react';



export default function UserIdentityBadge() {

const { address } = useAccount();



// 1. Fetch ENS Name

const { data: ensName, isLoading } = useEnsName({

address,

chainId: sepolia.id,

});



// 2. Fetch zkTLS Reclaim Verification Status

const { data: isVerified } = useReadContract({

address: GATEWAY_ADDRESS as `0x${string}`,

abi: GATEWAY_ABI,

functionName: 'isCreditVerified',

args: address ? [address] : undefined,

query: { enabled: !!address }

});



// 3. Fetch Active Loan Status

const { data: loanData } = useReadContract({

address: GATEWAY_ADDRESS as `0x${string}`,

abi: GATEWAY_ABI,

functionName: 'activeLoans',

args: address ? [address] : undefined,

query: { enabled: !!address }

});



const loan = loanData as [bigint, bigint, bigint, bigint, bigint, boolean] | undefined;

const isActiveLoan = loan ? loan[5] : false;



// 4. Hackathon Trick: Track if they've paid off a loan in this session

const [hasRepaid, setHasRepaid] = useState(false);


useEffect(() => {

// Check if the repayment flag was set by the EmiDashboard

const checkRepayment = () => {

if (localStorage.getItem(`repaid_${address}`)) {

setHasRepaid(true);

}

};

checkRepayment();

// Listen for custom event from the dashboard

window.addEventListener('loanRepaid', checkRepayment);

return () => window.removeEventListener('loanRepaid', checkRepayment);

}, [address]);



// --- DETERMINE IDENTITY STATE ---

let statusPrefix = "anon";

let Icon = User;

let colorClass = "text-gray-500";

let gradientClass = "text-gray-400";



if (!isVerified) {

statusPrefix = "anon";

Icon = User;

colorClass = "text-gray-500";

gradientClass = "text-gray-400";

} else if (isVerified && !isActiveLoan && !hasRepaid) {

statusPrefix = "verified";

Icon = CheckCircle2;

colorClass = "text-blue-400";

gradientClass = "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500";

} else if (isActiveLoan) {

statusPrefix = "indebt";

Icon = AlertCircle;

colorClass = "text-orange-400";

gradientClass = "text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500";

} else if (isVerified && !isActiveLoan && hasRepaid) {

statusPrefix = "trusted";

Icon = ShieldCheck;

colorClass = "text-green-400";

gradientClass = "text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500";

}



const formattedAddress = `${address?.slice(0, 6)}...${address?.slice(-4)}`;

const baseIdentity = isLoading ? "resolving..." : (ensName || formattedAddress);



return (

<div className={`flex items-center gap-3 bg-gray-900 border px-4 py-2 rounded-lg shadow-sm transition-all duration-500 border-${colorClass.split('-')[1]}-500/30`}>

<Icon className={`w-4 h-4 ${colorClass}`} />

<span className={`font-mono text-sm font-bold ${gradientClass}`}>

{statusPrefix}.{baseIdentity}

</span>

</div>

);

}