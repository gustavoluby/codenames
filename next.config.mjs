// Para servir o jogo num subcaminho (ex.: gustavoluby.com/codenames), defina NEXT_PUBLIC_BASE_PATH=/codenames.
// Aceita "codenames", "/codenames" ou "/codenames/" — o Next exige barra na frente e nenhuma no fim.
const raw = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim().replace(/^\/+|\/+$/g, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: raw ? `/${raw}` : "",
};
export default nextConfig;
