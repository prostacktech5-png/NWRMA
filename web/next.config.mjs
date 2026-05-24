/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /** Public forms upload many PDFs; default 10MB truncates multipart and breaks submit. */
    middlewareClientMaxBodySize: '100mb',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@nwrma/shared'],
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: '/admin/users', destination: '/settings/users', permanent: false },
      { source: '/downloads', destination: '/online-forms', permanent: false },
      { source: '/index.html', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
