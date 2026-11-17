/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  transpilePackages: ['@polar-sh/orbit', '@polar-sh/ui', '@polar-sh/currency', '@polar-sh/i18n'],
  poweredByHeader: false,
}

export default nextConfig
