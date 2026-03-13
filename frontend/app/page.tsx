// app/page.tsx
import CheckoutCard from './components/CheckoutCard';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Product Display */}
        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold tracking-wide">
            Verified Merchant Partner
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
            Next-Gen <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              AI Compute Node
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md leading-relaxed">
            High-performance local inference rig. Purchase instantly with zero collateral using your off-chain reputation.
          </p>
        </div>

        {/* Right Side: The Paisa Protocol Checkout */}
        <div className="relative">
          <CheckoutCard />
        </div>

      </div>
    </div>
  );
}