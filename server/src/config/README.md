# 应用配置

本目录包含应用的配置文件和配置管理逻辑。

## 文件说明

### app.config.ts

应用的主配置文件，包含：

- **defaultConfig**: 默认配置对象，从环境变量读取值
- **getAppConfig()**: 获取当前应用配置
- **validateConfig()**: 验证配置值的有效性

## 配置项

所有配置项都可以通过环境变量覆盖。参考 `server/.env.example` 文件。

### 服务器配置

- **PORT**: 服务器端口（默认: 3000）
  - HTTP 和 WebSocket 共用此端口

### 消息配置

- **MESSAGE_TIMEOUT**: 消息发送超时时间（毫秒，默认: 5000）
- **MAX_MESSAGE_LENGTH**: 单条消息最大长度（字符数，默认: 1000）
- **MAX_MESSAGES_IN_MEMORY**: 内存中保存的最大消息数（默认: 1000）

### WebSocket 配置

- **HEARTBEAT_INTERVAL**: 心跳间隔（毫秒，默认: 30000）
- **RECONNECT_DELAY**: 重连延迟（毫秒，默认: 3000）
- **MAX_RECONNECT_ATTEMPTS**: 最大重连次数（默认: 5）

### CORS 配置

- **CORS_ORIGIN**: CORS 允许的源（默认: '*'）
  - 开发环境使用 '*'
  - 生产环境应设置为特定域名

### 静态资源配置

- **STATIC_ASSETS_PATH**: 前端静态资源路径
  - 默认: `../client/dist`（相对于 server/dist）

## 使用方法

### 在代码中使用配置

```typescript
import { getAppConfig } from './config/app.config';

const config = getAppConfig();
console.log(`Server port: ${config.port}`);
```

### 设置环境变量

#### 开发环境

创建 `server/.env` 文件：

```bash
PORT=3000
MESSAGE_TIMEOUT=5000
CORS_ORIGIN=*
```

#### 生产环境

在服务器上设置环境变量：

```bash
export PORT=3000
export CORS_ORIGIN=https://your-domain.com
export MAX_MESSAGES_IN_MEMORY=5000
```

## 配置验证

应用启动时会自动验证配置值：

- 端口号必须在 1-65535 之间
- 超时时间必须至少 1000ms
- 消息长度必须至少为 1
- 内存消息数必须至少为 1
- 心跳间隔必须至少 1000ms
- 重连延迟必须非负
- 最大重连次数必须非负

如果配置无效，应用将抛出错误并拒绝启动。
