/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Para servir o jogo num subcaminho (ex.: gustavoluby.com/codenames), defina NEXT_PUBLIC_BASE_PATH=/codenames
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};
export default nextConfig;
