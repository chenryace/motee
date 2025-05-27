# 🌐 Cloudflare Pages 部署指南

本指南将帮助您将 Matea 部署到 Cloudflare Pages。

## 📋 前置要求

1. **Cloudflare 账户** - [注册免费账户](https://dash.cloudflare.com/sign-up)
2. **PostgreSQL 数据库** - 可以使用现有的或创建新的
3. **GitHub 仓库** - 用于自动部署

## 🚀 部署步骤

### 1. 准备代码

```bash
# 克隆仓库
git clone https://github.com/your-username/matea.git
cd matea

# 安装依赖
npm install --legacy-peer-deps

# 构建项目
npm run build
npm run pages:build
```

### 2. 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 部分
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 选择您的 GitHub 仓库

### 3. 配置构建设置

在 Cloudflare Pages 项目设置中：

- **Framework preset**: `Next.js`
- **Build command**: `npm install --legacy-peer-deps && npm run build && npm run pages:build`
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/` (保持默认)
- **Node.js version**: `18.x` (推荐)

### 4. 设置环境变量

在 Cloudflare Pages 项目的 **Settings** → **Environment variables** 中添加：

```
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:5432/database
PASSWORD=your-admin-password
NEXTAUTH_URL=https://your-project.pages.dev
PRELOAD_NOTES_COUNT=30
```

**性能配置说明**：
- `PRELOAD_NOTES_COUNT=30`: CF Pages 推荐值，充分利用1000并发优势
- 可根据实际需求调整：10-50 都是合理范围

### 5. 部署

推送代码到 GitHub，Cloudflare Pages 将自动构建和部署。

## 🔧 本地开发

```bash
# 构建 Cloudflare Pages 版本
npm run build
npm run pages:build

# 本地预览 Cloudflare Pages
npm run pages:dev
```

## 📊 性能优势

相比 Vercel，Cloudflare Pages 提供：

- ✅ **更高并发**: 1000 vs 1 个并发请求
- ✅ **更长执行时间**: 10秒函数执行时间
- ✅ **无限带宽**: vs Vercel 的 100GB 限制
- ✅ **更低成本**: 免费计划更慷慨

## 🛠️ 故障排除

### 构建失败
- 确保使用 `--legacy-peer-deps` 安装依赖
- 检查 Node.js 版本 (推荐 18.x)

### 数据库连接问题
- 确保数据库 URL 正确
- 检查防火墙设置允许 Cloudflare IP

### 环境变量问题
- 确保所有必需的环境变量都已设置
- 注意区分生产和预览环境的变量

## 📞 支持

如有问题，请查看：
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [项目 Issues](https://github.com/your-username/matea/issues)
