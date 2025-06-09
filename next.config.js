/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,

    // If you load images from Firebase Storage URLs or other external sources, add them here:
    images: {
        domains: ['firebasestorage.googleapis.com'],
    },
};

module.exports = nextConfig;
