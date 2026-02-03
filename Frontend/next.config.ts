import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Suppress hydration warnings caused by browser extensions (DarkReader, etc.)
  reactStrictMode: true,
}

export default nextConfig
