// app/layout.tsx
import './globals.css';
import { Providers } from './providers';
import Navbar from './components/Navbar'; // <--- 1. WE IMPORT IT HERE

export const metadata = {
  title: 'Paisa EMI - ZK Credit Protocol',
  description: 'Undercollateralized DeFi lending using zkTLS.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white min-h-screen pt-20 font-sans antialiased">
        <Providers>
          <Navbar /> {/* <--- 2. WE PLACE IT HERE, ABOVE THE MAIN CONTENT */}
          <main className="max-w-7xl mx-auto px-6 py-12">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}