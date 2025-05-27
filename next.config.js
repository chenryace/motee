const nextPWA = require('next-pwa');
const cache = require('./scripts/cache');

const developmentEnv = process.env.NODE_ENV === 'development';

// Cloudflare Pages 开发环境设置
if (developmentEnv) {
    try {
        const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');
        setupDevPlatform();
    } catch (error) {
        // 如果没有安装 @cloudflare/next-on-pages，忽略错误
        console.log('Cloudflare Pages dev setup not available, continuing with standard Next.js dev');
    }
}

const withPWA = nextPWA({
    // target: process.env.NETLIFY ? 'serverless' : 'server',
    // mode: process.env.NODE_ENV ?? 'development',
    disable: developmentEnv,
    dest: 'public',
    runtimeCaching: cache,
});

module.exports = withPWA({
    swcMinify: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Cloudflare Pages 特定配置
    ...(process.env.CF_PAGES && {
        output: 'export',
        trailingSlash: true,
        images: {
            unoptimized: true,
        },
    }),
});
