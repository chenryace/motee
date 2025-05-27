#!/usr/bin/env node

/**
 * Windows 兼容的 Cloudflare Pages 构建脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building for Cloudflare Pages...');

try {
    // 1. 确保 Next.js 已经构建
    if (!fs.existsSync('.next')) {
        console.log('📦 Building Next.js first...');
        execSync('npm run build', { stdio: 'inherit' });
    }

    // 2. 创建 Vercel 输出目录结构
    const outputDir = '.vercel/output';
    const staticDir = path.join(outputDir, 'static');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir, { recursive: true });
    }

    // 3. 复制静态文件
    console.log('📁 Copying static files...');
    
    // 复制 public 目录
    if (fs.existsSync('public')) {
        execSync(`xcopy public ${staticDir} /E /I /Y`, { stdio: 'inherit' });
    }
    
    // 复制 .next/static
    if (fs.existsSync('.next/static')) {
        const nextStaticDir = path.join(staticDir, '_next', 'static');
        if (!fs.existsSync(path.dirname(nextStaticDir))) {
            fs.mkdirSync(path.dirname(nextStaticDir), { recursive: true });
        }
        execSync(`xcopy .next\\static ${nextStaticDir} /E /I /Y`, { stdio: 'inherit' });
    }

    // 4. 创建 Cloudflare Pages 配置
    const config = {
        version: 3,
        routes: [
            {
                src: '/api/(.*)',
                dest: '/api/$1'
            },
            {
                src: '/(.*)',
                dest: '/$1'
            }
        ]
    };

    fs.writeFileSync(
        path.join(outputDir, 'config.json'),
        JSON.stringify(config, null, 2)
    );

    // 5. 创建 _routes.json (Cloudflare Pages 路由配置)
    const routes = {
        version: 1,
        include: ['/api/*'],
        exclude: ['/_next/static/*', '/favicon.ico', '/robots.txt']
    };

    fs.writeFileSync(
        path.join(staticDir, '_routes.json'),
        JSON.stringify(routes, null, 2)
    );

    console.log('✅ Cloudflare Pages build completed!');
    console.log(`📁 Output directory: ${staticDir}`);
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
