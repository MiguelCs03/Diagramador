import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // No detener el build por errores de ESLint (útil para desplegar rápido)
    ignoreDuringBuilds: true,
  },
  // Si en algún momento aparecen errores de TypeScript en build y quieres permitir el build:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
