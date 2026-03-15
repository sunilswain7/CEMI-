import { http, createConfig } from 'wagmi';
import { baseSepolia, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  // 1. Tell Wagmi your app supports both of these testnets
  chains: [baseSepolia, sepolia],
  
  // 2. Set up the default wallet connector (MetaMask)
  connectors: [
    injected(),
  ],
  
  // 3. Route traffic through your dedicated Alchemy RPC nodes
  transports: {
    [baseSepolia.id]: http('https://base-sepolia.g.alchemy.com/v2/wp_HAvabtWuMdZAini8hN'),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/wp_HAvabtWuMdZAini8hN'),
  },
});