import type { NextConfig } from "next";

let derivedBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";
if (derivedBasePath && !derivedBasePath.startsWith("/")) {
  derivedBasePath = `/${derivedBasePath}`;
}
if (derivedBasePath === "/") {
  derivedBasePath = "";
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(derivedBasePath ? { basePath: derivedBasePath, assetPrefix: derivedBasePath } : {}),
};

export default nextConfig;


