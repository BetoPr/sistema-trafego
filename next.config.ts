import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Binarios nativos (@napi-rs/canvas tem .node binding) precisam ficar externos
  // — Turbopack nao empacota them dentro do bundle, carrega via require em runtime.
  serverExternalPackages: ["@napi-rs/canvas"],
  experimental: {
    // Upload de imagem/mídia via Server Action — padrão é 1MB e estourava (413).
    // Teto real continua sendo o limite da Vercel (~4.5MB por request).
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
