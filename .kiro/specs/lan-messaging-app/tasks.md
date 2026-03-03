# 实现计划: 局域网消息应用

## 概述

本实现计划将局域网消息应用分解为增量式的开发任务。应用采用 NestJS 后端 + React 前端架构，通过 WebSocket (Socket.io) 实现实时消息传递。实现顺序遵循从核心功能到辅助功能的原则，确保每个步骤都能验证核心功能。

## 任务列表

- [x] 1. 搭建项目基础结构
  - 创建 monorepo 目录结构（server 和 client 文件夹）
  - 初始化 NestJS 后端项目（使用 @nestjs/cli）
  - 初始化 React + TypeScript 前端项目（使用 Vite）
  - 配置 TypeScript 编译选项
  - 安装核心依赖：@nestjs/websockets, socket.io, socket.io-client
  - _需求: 所有功能的基础_

- [x] 2. 实现后端数据模型和接口定义
  - [x] 2.1 创建数据模型类型定义
    - 在 server/src/types/ 目录下创建 message.interface.ts, user.interface.ts
    - 定义 Message, User, ConnectionStatus, ValidationResult 等接口
    - 定义 WebSocket 事件的 DTO 类型（SendMessageDto, MessageResponse 等）
    - _需求: 5.3, 5.4, 3.2, 3.3, 3.4_

  - [x] 2.2 为数据模型编写属性测试
    - **属性 5: 消息对象完整性**
    - **验证需求: 3.3, 3.4, 5.3, 5.4**
    - **属性 14: 消息往返一致性**
    - **验证需求: 数据完整性**

- [x] 3. 实现后端 Repository 层
  - [x] 3.1 实现 UserRepository
    - 创建 server/src/repositories/user.repository.ts
    - 使用 Map 存储在线用户（key: socketId, value: User）
    - 实现 add, remove, findBySocketId, findByIP, findAll 等方法
    - _需求: 2.1, 2.2, 4.1_

  - [x] 3.2 实现 MessageRepository
    - 创建 server/src/repositories/message.repository.ts
    - 使用数组存储消息历史（最多1000条）
    - 实现 save, findAll, findByUserIP, findConversation, cleanup 等方法
    - 实现自动清理旧消息的逻辑（FIFO）
    - _需求: 5.1, 5.2, 5.5_

  - [x] 3.3 为 Repository 层编写单元测试
    - 测试 CRUD 操作
    - 测试边界条件（空列表、满容量等）
    - _需求: 5.1, 5.2_

- [x] 4. 实现后端 Service 层
  - [x] 4.1 实现 ValidationService
    - 创建 server/src/services/validation.service.ts
    - 实现 IP 地址格式验证（IPv4 正则表达式）
    - 实现消息内容验证（非空、长度限制1000字符）
    - 实现综合验证方法 validateSendMessageRequest
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 4.2 为 ValidationService 编写属性测试
    - **属性 8: IP地址格式验证**
    - **验证需求: 6.1, 6.2**
    - **属性 9: 消息内容验证**
    - **验证需求: 6.3, 6.4, 6.5**

  - [x] 4.3 实现 UserService
    - 创建 server/src/services/user.service.ts
    - 注入 UserRepository
    - 实现 registerUser, removeUser, getOnlineUsers, findUserByIP 等方法
    - 实现 updateUserActivity 方法
    - _需求: 2.1, 2.2, 2.3, 4.1_

  - [x] 4.4 为 UserService 编写属性测试
    - **属性 3: 在线用户列表准确性**
    - **验证需求: 2.1, 2.2, 2.3**
    - **属性 4: 用户连接和断开的一致性**
    - **验证需求: 2.1, 4.1**

  - [x] 4.5 实现 MessageService
    - 创建 server/src/services/message.service.ts
    - 注入 MessageRepository
    - 实现 createMessage, saveMessage, getMessageHistory 等方法
    - 实现 getUserMessageHistory 和 getConversation 方法
    - 实现消息清理逻辑（调用 repository 的 cleanup）
    - _需求: 1.4, 3.1, 5.1, 5.2, 5.5_

  - [x] 4.6 为 MessageService 编写属性测试
    - **属性 6: 消息历史持久性**
    - **验证需求: 5.1, 5.2**
    - **属性 7: 消息时间顺序**
    - **验证需求: 5.5**

- [x] 5. 检查点 - 确保后端基础服务测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 实现后端 WebSocket Gateway
  - [x] 6.1 创建 MessagingGateway 基础结构
    - 创建 server/src/gateways/messaging.gateway.ts
    - 使用 @WebSocketGateway 装饰器配置 CORS
    - 注入 MessageService, UserService, ValidationService
    - 实现 OnGatewayConnection 和 OnGatewayDisconnect 接口
    - _需求: 所有实时通信功能的基础_

  - [x] 6.2 实现用户连接和断开处理
    - 实现 handleConnection 方法：获取客户端 IP，注册用户，广播在线列表
    - 实现 handleDisconnect 方法：移除用户，广播用户离线和更新在线列表
    - 实现 getClientIP 私有方法（从 Socket 对象提取 IP）
    - _需求: 2.1, 4.1, 7.1_

  - [x] 6.3 实现消息发送处理
    - 实现 @SubscribeMessage('sendMessage') 处理器
    - 验证消息内容和目标 IP
    - 检查目标用户是否在线
    - 创建消息对象并存储
    - 推送消息给目标用户（emit 'newMessage'）
    - 发送确认给发送方（emit 'messageSent'）
    - 处理错误情况（emit 'messageError'）
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2_

  - [x] 6.4 实现在线用户列表查询
    - 实现 @SubscribeMessage('getOnlineUsers') 处理器
    - 返回当前所有在线用户列表
    - _需求: 2.1, 2.2, 2.3_

  - [x] 6.5 实现消息历史查询
    - 实现 @SubscribeMessage('getMessageHistory') 处理器
    - 支持查询所有消息或特定用户的对话
    - 支持限制返回数量
    - _需求: 5.1, 5.2_

  - [x] 6.6 实现广播方法
    - 实现 broadcastOnlineUsers 私有方法
    - 实现 broadcastUserJoined 私有方法
    - 实现 broadcastUserLeft 私有方法
    - _需求: 2.2, 2.8_

  - [x] 6.7 为 Gateway 编写集成测试
    - 测试用户连接和断开流程
    - 测试消息发送成功和失败场景
    - 测试广播功能
    - **属性 1: 消息成功发送到在线用户**
    - **验证需求: 1.4, 3.1, 3.2**
    - **属性 2: 离线用户消息发送失败**
    - **验证需求: 1.6**

- [x] 7. 配置 NestJS 应用模块和静态资源服务
  - [x] 7.1 配置 AppModule
    - 在 server/src/app.module.ts 中注册所有 providers
    - 注册 MessagingGateway, Services, Repositories
    - _需求: 所有后端功能的集成_

  - [x] 7.2 配置静态资源服务
    - 在 main.ts 中配置 NestJS 提供前端静态文件
    - 设置 CORS 配置
    - 配置端口（默认3000）
    - _需求: 10.1, 10.2, 10.3_

  - [x] 7.3 创建应用配置文件
    - 创建 server/src/config/app.config.ts
    - 定义 AppConfig 接口和默认配置
    - _需求: 所有配置相关需求_

- [x] 8. 检查点 - 确保后端完整功能可运行
  - 确保所有测试通过，如有问题请询问用户

- [x] 9. 实现前端 WebSocket 客户端
  - [x] 9.1 创建 WebSocket 服务
    - 创建 client/src/services/websocket.service.ts
    - 实现 Socket.io 客户端连接管理
    - 实现连接、断开、重连逻辑（最多5次，间隔3秒）
    - 实现事件监听器注册和移除
    - 实现消息发送方法
    - _需求: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 定义前端类型
    - 创建 client/src/types/ 目录
    - 定义与后端一致的接口类型（Message, User, ConnectionStatus 等）
    - 定义 WebSocket 事件类型
    - _需求: 所有前端功能的类型安全_

  - [x] 9.3 为 WebSocket 客户端编写单元测试
    - 测试连接建立和断开
    - 测试重连逻辑
    - 测试事件监听和发送
    - **属性 10: 连接状态一致性**
    - **验证需求: 7.1, 7.4**

- [x] 10. 实现前端状态管理
  - [x] 10.1 创建应用状态 Context
    - 创建 client/src/context/AppContext.tsx
    - 定义 AppState 接口（currentUser, messages, onlineUsers, connectionStatus）
    - 实现 Context Provider 和自定义 Hook（useAppContext）
    - _需求: 所有前端状态管理_

  - [x] 10.2 实现状态更新逻辑
    - 实现添加消息、更新在线用户列表、更新连接状态等方法
    - 实现消息状态转换逻辑（pending -> sent/failed）
    - _需求: 1.5, 8.3_

  - [x] 10.3 为状态管理编写属性测试
    - **属性 11: 消息发送状态转换**
    - **验证需求: 1.5, 8.3**

- [x] 11. 实现前端核心组件
  - [x] 11.1 实现 ConnectionStatus 组件
    - 创建 client/src/components/ConnectionStatus.tsx
    - 显示连接状态（connecting/connected/disconnected）
    - 显示本机 IP 地址
    - 实现复制 IP 到剪贴板功能
    - 实现重连按钮
    - 使用 Tailwind CSS 样式
    - _需求: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_

  - [x] 11.2 实现 OnlineUserList 组件
    - 创建 client/src/components/OnlineUserList.tsx
    - 显示在线用户列表（IP 地址）
    - 实现搜索/过滤功能
    - 实现用户选择功能（点击自动填充到输入框）
    - 显示空状态提示
    - 使用 Tailwind CSS 实现响应式布局
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8_

  - [x] 11.3 为 OnlineUserList 编写属性测试
    - **属性 13: 用户过滤功能**
    - **验证需求: 2.4**

  - [x] 11.4 实现 MessageInput 组件
    - 创建 client/src/components/MessageInput.tsx
    - 实现目标 IP 输入框（支持手动输入和自动填充）
    - 实现消息内容输入框（textarea）
    - 实现实时输入验证（IP 格式、消息长度）
    - 实现发送按钮（根据验证结果和连接状态禁用/启用）
    - 实现 Enter 键发送（Shift+Enter 换行）
    - 显示字符计数（当前/1000）
    - 显示加载状态
    - 使用 Tailwind CSS 实现响应式布局
    - _需求: 1.1, 1.2, 1.3, 2.5, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 8.3, 8.4_

  - [x] 11.5 实现 MessageList 组件
    - 创建 client/src/components/MessageList.tsx
    - 显示消息历史（发送和接收的消息）
    - 使用不同颜色区分发送和接收的消息
    - 显示发送方 IP、接收方 IP 和时间戳
    - 显示消息状态（pending/sent/failed）
    - 实现自动滚动到底部（接收新消息时）
    - 显示空状态提示
    - 使用 Tailwind CSS 实现响应式布局
    - _需求: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.5_

  - [x] 11.6 为核心组件编写单元测试
    - 测试组件渲染
    - 测试用户交互（点击、输入等）
    - 测试条件渲染（空状态、加载状态等）
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12. 实现 App 主组件和集成
  - [x] 12.1 实现 App 组件
    - 创建 client/src/App.tsx
    - 集成 AppContext Provider
    - 初始化 WebSocket 连接
    - 注册所有 WebSocket 事件监听器（connected, newMessage, messageSent, messageError, onlineUsersUpdate 等）
    - 实现发送消息处理函数
    - 实现用户选择处理函数
    - 布局所有子组件（ConnectionStatus, OnlineUserList, MessageList, MessageInput）
    - 使用 Tailwind CSS 实现响应式布局（移动端/桌面端）
    - _需求: 8.1, 10.4, 10.5, 10.6_

  - [x] 12.2 实现错误处理和错误边界
    - 创建 client/src/components/ErrorBoundary.tsx
    - 捕获未预期错误
    - 显示用户友好的错误提示
    - 提供刷新页面选项
    - _需求: 9.3, 9.4_

  - [x] 12.3 实现错误提示组件
    - 创建 client/src/components/ErrorToast.tsx
    - 显示各类错误信息（连接错误、发送失败、验证错误等）
    - 实现自动消失（3-5秒）
    - 使用 Tailwind CSS 样式
    - _需求: 1.6, 6.2, 6.5, 7.2, 9.1, 9.2_

- [x] 13. 实现响应式设计和跨平台兼容性
  - [x] 13.1 配置 Tailwind CSS 响应式断点
    - 配置 tailwind.config.js
    - 定义移动端断点（<768px）和桌面端断点（≥768px）
    - _需求: 10.4, 10.5, 10.6_

  - [x] 13.2 优化移动端布局
    - 调整组件在小屏幕上的布局（垂直堆叠）
    - 增大触摸目标尺寸（按钮、输入框）
    - 优化字体大小和行高
    - 测试在移动设备浏览器上的显示
    - _需求: 10.1, 10.5, 10.7, 10.8_

  - [x] 13.3 优化桌面端布局
    - 实现多列布局（在线用户列表 + 消息区域）
    - 优化宽屏显示
    - 测试在桌面浏览器上的显示
    - _需求: 10.3, 10.6, 10.8_

  - [x] 13.4 进行跨平台兼容性测试
    - 在移动设备（手机）上测试
    - 在平板设备上测试
    - 在桌面浏览器上测试
    - 验证所有交互元素可操作
    - _需求: 10.1, 10.2, 10.3, 10.7, 10.9_

- [x] 14. 检查点 - 确保前端完整功能可运行
  - 确保所有测试通过，如有问题请询问用户

- [x] 15. 实现构建和部署配置
  - [x] 15.1 配置前端构建
    - 配置 Vite 构建输出到 client/dist
    - 优化生产构建（代码分割、压缩等）
    - _需求: 部署相关_

  - [x] 15.2 配置后端静态资源路径
    - 在 NestJS main.ts 中配置静态资源路径指向 client/dist
    - 配置 SPA 路由回退（所有路由返回 index.html）
    - _需求: 部署相关_

  - [x] 15.3 创建启动脚本
    - 创建 package.json 脚本用于构建和启动
    - 创建开发模式脚本（前后端并行运行）
    - 创建生产模式脚本（构建前端 + 启动后端）
    - _需求: 部署相关_

  - [x] 15.4 编写部署文档
    - 创建 README.md 说明如何部署到公司服务器
    - 说明如何配置服务器 IP 和端口
    - 说明用户如何访问应用（http://服务器IP:端口）
    - _需求: 部署相关_

- [x] 16. 端到端集成测试
  - [x] 16.1 测试完整用户流程
    - 用户连接 -> 查看在线列表 -> 发送消息 -> 接收消息
    - 用户断开 -> 自动重连
    - 多用户同时发送消息
    - 错误处理流程
    - **属性 12: 错误后应用可用性**
    - **验证需求: 9.4**

- [x] 17. 最终检查点 - 完整功能验证
  - 确保所有测试通过，所有功能正常工作，如有问题请询问用户

## 注意事项

- 标记 `*` 的任务为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，确保可追溯性
- 检查点任务用于增量验证，确保每个阶段的代码质量
- 属性测试验证通用正确性属性，单元测试验证具体示例和边缘情况
- 实现顺序遵循从后端到前端、从核心到辅助的原则
- 所有代码使用 TypeScript 编写，确保类型安全
