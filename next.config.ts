import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Indicador flotante (esquina) en `next dev` — confunde; errores siguen en overlay. */
  devIndicators: false,
  /**
   * Turbopack root fijo al directorio del proyecto.
   * Evita el error "couldn't find Next.js package from project directory .../app".
   */
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: ["better-sqlite3", "@modelcontextprotocol/sdk"],
  images: {
    qualities: [75, 80],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ddragon.leagueoflegends.com",
        pathname: "/cdn/**",
      },
      {
        protocol: "https",
        hostname: "raw.communitydragon.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
