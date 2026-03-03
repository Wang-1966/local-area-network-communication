# 需求文档

## 介绍

局域网消息应用是一个基于Web的实时消息传递系统，允许连接到同一局域网（公司Wi-Fi）的用户通过IP地址相互发送和接收消息。该应用无需中央服务器，支持点对点通信。

## 术语表

- **Messaging_App**: 局域网消息应用系统
- **Sender**: 发送消息的用户
- **Receiver**: 接收消息的用户
- **Target_IP**: 接收方的IP地址
- **Message**: 用户发送的文本内容
- **Connection**: 发送方与接收方之间的网络连接
- **LAN**: 局域网（Local Area Network），指公司Wi-Fi网络环境
- **Device_Discovery**: 自动扫描和发现局域网内可用设备的功能
- **Available_Device**: 在LAN内可被发现的设备及其IP地址

## 需求

### 需求 1: 发送消息

**用户故事:** 作为发送方，我想向指定IP地址发送消息，以便与局域网内的同事通信

#### 验收标准

1. THE Messaging_App SHALL 支持通过Device_Discovery选择Target_IP
2. THE Messaging_App SHALL 支持手动输入Target_IP
3. THE Messaging_App SHALL 提供输入框用于输入Message内容
4. WHEN Sender点击发送按钮, THE Messaging_App SHALL 将Message发送到Target_IP
5. WHEN Message成功发送, THE Messaging_App SHALL 显示发送成功提示
6. IF Target_IP无法连接, THEN THE Messaging_App SHALL 显示连接失败错误信息

### 需求 2: 设备发现与选择

**用户故事:** 作为发送方，我想查看或搜索局域网内可用的设备，以便快速选择消息接收方而无需手动输入IP地址

#### 验收标准

1. THE Messaging_App SHALL 提供Device_Discovery功能以扫描LAN内的Available_Device
2. WHEN Sender触发设备扫描, THE Messaging_App SHALL 显示扫描到的Available_Device列表
3. THE Messaging_App SHALL 为每个Available_Device显示其IP地址
4. THE Messaging_App SHALL 提供搜索或过滤Available_Device的功能
5. WHEN Sender从列表中选择一个Available_Device, THE Messaging_App SHALL 自动填充该设备的IP地址到Target_IP输入框
6. THE Messaging_App SHALL 支持手动输入Target_IP作为备选方式
7. WHEN 手动输入Target_IP, THE Messaging_App SHALL 允许Sender直接输入而不依赖Device_Discovery
8. THE Messaging_App SHALL 在设备列表为空时显示提示信息

### 需求 3: 接收消息

**用户故事:** 作为接收方，我想接收来自局域网内其他用户的消息，以便及时查看同事发送的内容

#### 验收标准

1. THE Messaging_App SHALL 监听来自LAN内其他用户的消息
2. WHEN 接收到新Message, THE Messaging_App SHALL 在界面上显示该Message
3. WHEN 接收到新Message, THE Messaging_App SHALL 显示发送方的IP地址
4. WHEN 接收到新Message, THE Messaging_App SHALL 显示消息接收时间

### 需求 4: 显示本机IP地址

**用户故事:** 作为用户，我想查看自己的IP地址，以便告知其他同事向我发送消息

#### 验收标准

1. WHEN Messaging_App启动, THE Messaging_App SHALL 获取本机在LAN中的IP地址
2. THE Messaging_App SHALL 在界面显著位置显示本机IP地址
3. THE Messaging_App SHALL 提供复制IP地址到剪贴板的功能

### 需求 5: 消息历史记录

**用户故事:** 作为用户，我想查看发送和接收的消息历史，以便回顾之前的对话内容

#### 验收标准

1. THE Messaging_App SHALL 显示所有已发送的Message列表
2. THE Messaging_App SHALL 显示所有已接收的Message列表
3. THE Messaging_App SHALL 为每条Message标注发送方IP和接收方IP
4. THE Messaging_App SHALL 为每条Message标注时间戳
5. THE Messaging_App SHALL 按时间顺序排列Message（最新的在最下方）

### 需求 6: 输入验证

**用户故事:** 作为用户，我想系统验证我的输入，以便避免发送无效的消息或IP地址

#### 验收标准

1. WHEN Sender输入Target_IP, THE Messaging_App SHALL 验证IP地址格式是否有效
2. IF Target_IP格式无效, THEN THE Messaging_App SHALL 显示格式错误提示
3. IF Message内容为空, THEN THE Messaging_App SHALL 禁用发送按钮
4. THE Messaging_App SHALL 限制单条Message长度不超过1000个字符
5. IF Message超过长度限制, THEN THE Messaging_App SHALL 显示字符数超限提示

### 需求 7: 网络连接状态

**用户故事:** 作为用户，我想了解应用的网络连接状态，以便知道是否可以正常收发消息

#### 验收标准

1. THE Messaging_App SHALL 显示当前网络连接状态（已连接/未连接）
2. WHEN Messaging_App无法访问LAN, THE Messaging_App SHALL 显示网络断开警告
3. WHEN 网络从断开恢复到连接, THE Messaging_App SHALL 显示网络已恢复提示
4. WHILE 网络断开, THE Messaging_App SHALL 禁用消息发送功能

### 需求 8: 用户界面响应

**用户故事:** 作为用户，我想要一个清晰易用的界面，以便快速发送和查看消息

#### 验收标准

1. THE Messaging_App SHALL 在单个页面内显示所有核心功能
2. THE Messaging_App SHALL 使用不同颜色区分已发送和已接收的Message
3. THE Messaging_App SHALL 在Message发送过程中显示加载状态
4. THE Messaging_App SHALL 支持使用Enter键快速发送Message
5. WHEN 接收到新Message, THE Messaging_App SHALL 自动滚动到消息列表底部

### 需求 9: 错误处理

**用户故事:** 作为用户，我想在出现错误时获得清晰的提示，以便了解问题并采取相应措施

#### 验收标准

1. IF 消息发送超时（超过5秒无响应）, THEN THE Messaging_App SHALL 显示超时错误信息
2. IF 接收到格式错误的Message, THEN THE Messaging_App SHALL 记录错误但不显示该Message
3. IF 系统发生未预期错误, THEN THE Messaging_App SHALL 显示通用错误提示并记录错误详情
4. THE Messaging_App SHALL 在错误发生后保持应用可用状态

### 需求 10: 跨平台兼容性与响应式设计

**用户故事:** 作为用户，我想在不同设备（手机、平板、桌面电脑）上使用该应用，以便在任何场景下都能方便地收发消息

#### 验收标准

1. THE Messaging_App SHALL 在移动设备（手机）浏览器上正常运行
2. THE Messaging_App SHALL 在平板设备浏览器上正常运行
3. THE Messaging_App SHALL 在桌面浏览器上正常运行
4. THE Messaging_App SHALL 根据屏幕尺寸自动调整界面布局
5. WHEN 屏幕宽度小于768像素, THE Messaging_App SHALL 使用移动端优化布局
6. WHEN 屏幕宽度大于等于768像素, THE Messaging_App SHALL 使用桌面端布局
7. THE Messaging_App SHALL 确保所有交互元素在触摸屏设备上可操作
8. THE Messaging_App SHALL 确保文本在所有屏幕尺寸下清晰可读
9. THE Messaging_App SHALL 在不同设备上保持一致的功能体验
