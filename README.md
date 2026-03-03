# 局域网消息应用 (LAN Messaging App)

一个基于Web的实时消息传递系统，允许连接到同一局域网的用户通过IP地址相互发送和接收消息。

## 功能特性

- 🚀 实时消息传递 - 基于WebSocket的即时通信
- 👥 在线用户发现 - 自动显示局域网内的在线用户
- 💬 消息历史 - 保存和查看消息记录
- 📱 响应式设计 - 支持移动端、平板和桌面设备
- 🔒 输入验证 - 自动验证IP地址和消息内容
- ⚡ 高性能 - 优化的前端构建和后端架构

## 技术栈

- **前端**: React + TypeScript + Tailwind CSS + Vite
- **后端**: NestJS + TypeScript + Socket.io
- **通信**: WebSocket (Socket.io)
- **数据存储**: 内存存储

## 快速开始

### 前置要求

- Node.js 16+ 
- npm 8+

### 安装依赖

```bash
npm run install:all
```

### 开发模式

在开发模式下，前端和后端会并行运行：

```bash
npm run dev
```

这会启动：
- 前端开发服务器: http://localhost:5173
- 后端服务器: http://localhost:3000

### 生产模式

构建前端并启动后端服务器：

```bash
npm run prod
```

或分步执行：

```bash
# 构建前端
npm run build:client

# 构建后端
npm run build:server

# 启动后端服务器
npm start
```

## 部署到公司服务器

### 部署步骤

1. **准备服务器环境**
   - 确保服务器安装了 Node.js 16+ 和 npm 8+
   - 创建应用目录，例如 `/opt/lan-messaging-app`

2. **上传应用代码**
   ```bash
   # 在本地机器上
   scp -r . user@server_ip:/opt/lan-messaging-app
   ```

3. **安装依赖**
   ```bash
   cd /opt/lan-messaging-app
   npm run install:all
   ```

4. **构建应用**
   ```bash
   npm run build
   ```

5. **启动应用**
   ```bash
   npm start
   ```

   应用将在 http://服务器IP:3000 上运行

### 配置服务器IP和端口

#### 修改后端端口

编辑 `server/src/config/app.config.ts`，修改 `port` 配置：

```typescript
export const getAppConfig = (): AppConfig => ({
  port: 3000,  // 修改为所需的端口
  // ... 其他配置
});
```

#### 修改前端连接地址

前端会自动连接到当前服务器地址。如果需要手动配置，编辑 `client/src/services/websocket.service.ts`：

```typescript
// 修改连接地址
const socket = io('http://服务器IP:端口', {
  reconnection: true,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

### 使用应用

1. **访问应用**
   - 在浏览器中打开 `http://服务器IP:3000`
   - 应用会自动获取您的IP地址

2. **查看在线用户**
   - 在线用户列表会显示所有连接到服务器的用户
   - 点击用户可以快速选择作为消息接收方

3. **发送消息**
   - 输入接收方的IP地址或从在线列表中选择
   - 输入消息内容
   - 点击发送按钮或按 Enter 键发送

4. **接收消息**
   - 新消息会实时显示在消息列表中
   - 消息会自动按时间顺序排列

## 脚本命令

### 开发命令

```bash
# 并行运行前后端开发服务器
npm run dev

# 仅运行前端开发服务器
npm run dev:client

# 仅运行后端开发服务器
npm run dev:server
```

### 构建命令

```bash
# 构建前后端
npm run build

# 仅构建前端
npm run build:client

# 仅构建后端
npm run build:server
```

### 启动命令

```bash
# 启动后端服务器（生产模式）
npm start

# 构建并启动（完整生产流程）
npm run prod
```

### 测试命令

```bash
# 运行所有测试
npm test

# 仅运行后端测试
npm run test:server

# 仅运行前端测试
npm run test:client
```

## 项目结构

```
lan-messaging-app/
├── server/                 # NestJS 后端
│   ├── src/
│   │   ├── gateways/      # WebSocket 网关
│   │   ├── services/      # 业务逻辑服务
│   │   ├── repositories/  # 数据访问层
│   │   ├── types/         # 类型定义
│   │   ├── config/        # 配置文件
│   │   ├── app.module.ts  # 应用模块
│   │   └── main.ts        # 应用入口
│   ├── test/              # 测试文件
│   └── package.json
├── client/                 # React 前端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   ├── services/      # 客户端服务
│   │   ├── context/       # 状态管理
│   │   ├── types/         # 类型定义
│   │   ├── App.tsx        # 主应用组件
│   │   └── main.tsx       # 应用入口
│   ├── dist/              # 构建输出目录
│   ├── vite.config.ts     # Vite 配置
│   └── package.json
├── package.json           # 根 package.json
└── README.md             # 本文件
```

## 故障排除

### 应用无法启动

1. **检查 Node.js 版本**
   ```bash
   node --version  # 应该是 16+
   ```

2. **检查端口是否被占用**
   ```bash
   # Linux/Mac
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

3. **清除缓存并重新安装**
   ```bash
   rm -rf node_modules server/node_modules client/node_modules
   npm run install:all
   ```

### 无法连接到服务器

1. **检查防火墙设置**
   - 确保服务器的 3000 端口对客户端开放

2. **检查网络连接**
   - 确保客户端和服务器在同一局域网

3. **检查服务器地址**
   - 使用 `ipconfig` (Windows) 或 `ifconfig` (Linux/Mac) 获取服务器IP地址

### 消息无法发送

1. **检查接收方是否在线**
   - 在线用户列表中应该显示接收方

2. **检查IP地址格式**
   - IP地址应该是有效的 IPv4 格式（例如：192.168.1.1）

3. **检查消息长度**
   - 消息长度不能超过 1000 个字符

## 性能优化

### 前端优化

- **代码分割**: 自动将 React、Socket.io 等依赖分离为独立的 chunk
- **压缩**: 生产构建使用 Terser 进行代码压缩
- **CSS 分离**: CSS 代码自动分离为独立文件
- **移除 console**: 生产构建自动移除 console 语句

### 后端优化

- **内存管理**: 消息历史限制为 1000 条，自动清理旧消息
- **WebSocket 优化**: 使用 Socket.io 的自动重连和心跳机制
- **CORS 配置**: 生产环境应配置特定的 CORS 源

## 安全建议

1. **生产环境配置**
   - 修改 `app.config.ts` 中的 `corsOrigin` 为特定的域名
   - 启用 HTTPS（使用反向代理如 Nginx）

2. **网络安全**
   - 在防火墙中限制对 3000 端口的访问
   - 仅允许局域网内的连接

3. **数据安全**
   - 消息存储在内存中，服务器重启后会丢失
   - 如需持久化，可扩展为使用数据库

## 许可证

MIT

## 支持

如有问题或建议，请联系开发团队。
