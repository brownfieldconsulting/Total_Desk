import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norwich Auto Repairs",
  description: "Repair shop management — repairs, invoicing, inventory, and financial reporting",
  icons: { icon: "/branding/favicon-64.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
