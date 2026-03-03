··#!/bin/bash

# 局域网消息应用 - 一键部署脚本

echo "🚀 开始部署局域网消息应用..."
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未安装Node.js"
    echo "请先安装Node.js 18+: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm run install:all
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo ""

# 构建应用
echo "🔨 构建应用..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi
echo ""

# 获取本机IP
echo "🌐 获取本机IP地址..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -n 1)
else
    IP="localhost"
fi

echo ""
echo "✅ 构建完成！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 部署成功！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 访问地址："
echo "   本机访问: http://localhost:3000"
echo "   局域网访问: http://$IP:3000"
echo ""
echo "🚀 启动服务器："
echo "   npm start"
echo ""
echo "或使用PM2后台运行："
echo "   npm install -g pm2"
echo "   pm2 start server/dist/main.js --name lan-messaging-app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
