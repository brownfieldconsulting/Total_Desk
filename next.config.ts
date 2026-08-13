import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "exceljs"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
