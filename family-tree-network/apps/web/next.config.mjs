/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // EZIDINET Desktop packages the web app as a self-contained Node server (desktop/scripts/build-bundle.mjs).
  // next/image is not used, so image optimisation (and its native `sharp` module) is switched off there.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone', images: { unoptimized: true } } : {}),
  // Optional same-origin API proxy (used by the Android development shell): when API_PROXY_TARGET is set,
  // the browser calls /api/* on the web server and Next.js forwards it to the API. Off by default.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    return target ? [{ source: '/api/:path*', destination: `${target.replace(/\/$/, '')}/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
