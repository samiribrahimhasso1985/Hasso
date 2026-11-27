/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Optional same-origin API proxy (used by the Android development shell): when API_PROXY_TARGET is set,
  // the browser calls /api/* on the web server and Next.js forwards it to the API. Off by default.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    return {
      // The public website is the home page; the platform itself lives at /app.
      beforeFiles: [{ source: '/', destination: '/site/index.html' }],
      afterFiles: target ? [{ source: '/api/:path*', destination: `${target.replace(/\/$/, '')}/:path*` }] : [],
    };
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
