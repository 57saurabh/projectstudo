/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['api.dicebear.com', 'lh3.googleusercontent.com'],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:4000/api/:path*', // Proxy to Backend
            },
            {
                source: '/friend-request/:path*', // Proxy legacy friend-request routes if any
                destination: 'http://localhost:4000/friend-request/:path*',
            }
        ];
    },
};

module.exports = nextConfig;
