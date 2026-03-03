# 局域网消息应用 - 部署指南

## 📋 部署前准备

### 系统要求
- Node.js 18+ 
- npm 或 yarn
- 局域网环境（公司WiFi）

### 服务器要求
- 一台局域网内的服务器或电脑
- 固定的局域网IP地址（推荐）
- 开放端口3000

---

## 🚀 快速部署（推荐）

### 步骤1：构建应用

在项目根目录运行：

```bash
# 构建前端和后端
npm run build
```

这会：
1. 构建前端React应用到 `client/dist`
2. 编译后端NestJS应用到 `server/dist`

### 步骤2：启动生产服务器

```bash
# 启动生产服务器
npm start
```

服务器将在端口3000启动。

### 步骤3：访问应用

在局域网内的任何设备上访问：
```
http://服务器IP:3000
```

例如：`http://192.168.9.127:3000`

---

## 🔧 详细部署步骤

### 方案A：在公司服务器上部署

#### 1. 上传代码到服务器

```bash
# 方式1：使用git
git clone <你的仓库地址>
cd lan-messaging-app

# 方式2：直接复制文件夹到服务器
scp -r lan-messaging-app user@server-ip:/path/to/deploy
```

#### 2. 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

#### 3. 构建应用

```bash
npm run build
```

#### 4. 启动服务

```bash
# 前台运行（测试用）
npm start

# 或使用PM2后台运行（推荐）
npm install -g pm2
pm2 start server/dist/main.js --name lan-messaging-app
pm2 save
pm2 startup
```

#### 5. 配置防火墙（如果需要）

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

### 方案B：在本地电脑上运行

如果你想在自己的电脑上运行服务器：

#### 1. 构建应用

```bash
npm run build
```

#### 2. 启动服务器

```bash
npm start
```

#### 3. 获取你的局域网IP

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

**Linux:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

#### 4. 分享给同事

告诉同事访问：`http://你的IP:3000`

---

## 🔄 使用PM2管理进程（推荐）

PM2是一个进程管理器，可以让应用在后台运行，并在崩溃时自动重启。

### 安装PM2

```bash
npm install -g pm2
```

### 启动应用

```bash
# 进入项目目录
cd lan-messaging-app

# 构建应用
npm run build

# 使用PM2启动
pm2 start server/dist/main.js --name lan-messaging-app

# 查看状态
pm2 status

# 查看日志
pm2 logs lan-messaging-app

# 停止应用
pm2 stop lan-messaging-app

# 重启应用
pm2 restart lan-messaging-app

# 删除应用
pm2 delete lan-messaging-app
```

### 设置开机自启

```bash
# 保存当前PM2进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 按照提示执行命令（通常需要sudo）
```

---

## 🌐 配置自定义端口

如果端口3000被占用，可以修改端口：

### 方式1：使用环境变量

```bash
PORT=8080 npm start
```

### 方式2：修改配置文件

编辑 `server/src/config/app.config.ts`：

```typescript
export const getAppConfig = (): AppConfig => {
  return {
    port: parseInt(process.env.PORT || '8080', 10), // 改为8080
    // ... 其他配置
  };
};
```

---

## 📱 移动设备访问

确保移动设备连接到同一个WiFi网络，然后访问：
```
http://服务器IP:3000
```

---

## 🔒 安全建议

### 1. 限制访问（可选）

如果只想让特定IP访问，可以配置防火墙：

```bash
# 只允许特定IP段访问
sudo ufw allow from 192.168.9.0/24 to any port 3000
```

### 2. 使用HTTPS（可选）

如果需要HTTPS，可以使用Nginx反向代理：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐛 故障排查

### 问题1：端口被占用

```bash
# 查找占用端口的进程
lsof -ti:3000

# 杀死进程
kill -9 $(lsof -ti:3000)
```

### 问题2：无法访问

1. 检查防火墙是否开放端口3000
2. 确认服务器和客户端在同一局域网
3. 检查服务器是否正在运行：`pm2 status` 或 `ps aux | grep node`

### 问题3：服务器重启后应用停止

使用PM2并配置开机自启：
```bash
pm2 startup
pm2 save
```

---

## 📊 监控和日志

### 查看应用日志

```bash
# PM2日志
pm2 logs lan-messaging-app

# 实时日志
pm2 logs lan-messaging-app --lines 100

# 错误日志
pm2 logs lan-messaging-app --err
```

### 监控资源使用

```bash
pm2 monit
```

---

## 🔄 更新应用

当你修改代码后：

```bash
# 1. 停止应用
pm2 stop lan-messaging-app

# 2. 拉取最新代码（如果使用git）
git pull

# 3. 重新构建
npm run build

# 4. 重启应用
pm2 restart lan-messaging-app
```

---

## 📝 环境变量配置

创建 `.env` 文件（可选）：

```bash
# server/.env
PORT=3000
NODE_ENV=production
MAX_MESSAGES=1000
MESSAGE_TIMEOUT=5000
```

---

## ✅ 部署检查清单

- [ ] Node.js已安装（18+）
- [ ] 依赖已安装（`npm run install:all`）
- [ ] 应用已构建（`npm run build`）
- [ ] 服务器已启动（`npm start` 或 `pm2 start`）
- [ ] 防火墙已配置（端口3000开放）
- [ ] 可以从其他设备访问
- [ ] PM2已配置开机自启（如果使用PM2）

---

## 🎉 完成！

现在你的局域网消息应用已经部署成功！

**访问地址：** `http://服务器IP:3000`

**功能特性：**
- ✅ 实时消息传递
- ✅ 在线用户列表
- ✅ 消息历史记录
- ✅ 响应式设计（支持手机、平板、电脑）
- ✅ 自动重连
- ✅ 错误处理

**技术支持：**
如有问题，请检查：
1. 服务器日志：`pm2 logs lan-messaging-app`
2. 浏览器控制台
3. 网络连接状态
