// app/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState, useEffect } from 'react'; 
import UserIdentityBadge from './UserIdentityBadge';

export default function Navbar() {
  const { address, status } = useAccount();
  const isConnected = status === 'connected';
  
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="w-full border-b border-gray-800 bg-black/50 backdrop-blur-md fixed top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Left Side: Logo & Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 tracking-tight">
            Paisa.Fi
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400 items-center">
            <Link href="/" className="hover:text-white transition-colors">Store</Link>
            
            {/* 👇 THE UPGRADE: Dynamically Unlocking Dashboard Link 👇 */}
            {!mounted ? (
               <span className="text-gray-800 animate-pulse">Loading...</span>
            ) : isConnected ? (
              <Link href="/dashboard" className="hover:text-purple-400 transition-colors font-bold text-white flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                My EMI Dashboard
              </Link>
            ) : (
              <span className="cursor-not-allowed text-gray-600" title="Connect wallet to unlock">
                My EMI Dashboard (Locked)
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Web3 Wallet Connect */}
        <div>
          {!mounted ? (
            <div className="w-[140px] h-[42px] bg-gray-900 rounded-lg animate-pulse border border-gray-800"></div>
          ) : isConnected ? (
            <button onClick={() => disconnect()} className="hover:opacity-80 transition-opacity">
              <UserIdentityBadge />
            </button>
          ) : (
            <button 
              onClick={() => connect({ connector: injected() })}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.5)] flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}