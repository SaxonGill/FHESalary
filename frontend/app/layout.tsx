import { MetaMaskProvider } from "../hooks/metamask/useMetaMaskProvider";
import "./globals.css";

export const metadata = {
  title: "FHE Salary Management",
  description: "Fully Homomorphic Encryption Salary Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <MetaMaskProvider>{children}</MetaMaskProvider>
      </body>
    </html>
  );
}


