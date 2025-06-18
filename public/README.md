# 不良贷款听证会签到系统

一个现代化的移动端听证会签到系统，支持扫码签到、精确定位、签到记录管理等功能。

## 🚀 在线体验

访问部署在Netlify的在线版本：[听证会签到系统](https://your-domain.netlify.app)

## 功能特性

### 📱 移动端优化
- 响应式设计，完美适配手机屏幕
- 触摸友好的界面元素
- 流畅的动画效果
- PWA 支持（可添加到桌面）

### 🔍 精确定位
- 集成腾讯地图API，提供高精度定位
- 智能降级策略：腾讯地图 → 浏览器原生定位
- 详细地址解析，包含周边POI信息
- 防止虚假位置，确保签到真实性

### 📊 签到管理
- 实时签到记录
- 签到统计（已签到/未签到人数）
- 支持查看个人签到记录
- 防重复签到机制

### 🔒 安全可靠
- 位置信息加密存储
- 时间戳验证
- 表单数据验证
- XSS攻击防护

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Vercel Serverless Functions
- **地图服务**: 腾讯地图API
- **存储**: Serverless数据存储
- **部署**: Netlify + GitHub
- **UI框架**: 原生CSS（无框架依赖）

## 快速部署

### 1. Fork项目
点击右上角 Fork 按钮复制项目到你的GitHub账户

### 2. 部署到Netlify
1. 访问 [netlify.com](https://netlify.com)
2. 使用GitHub账户登录
3. 点击 "New site from Git"
4. 选择刚刚Fork的项目
5. 保持默认设置，点击 "Deploy site"

### 3. 配置域名（可选）
- 在Netlify面板中设置自定义域名
- 更新二维码链接

## 本地开发

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装与运行

1. 克隆项目
```bash
git clone https://github.com/your-username/hearing-signin-system.git
cd hearing-signin-system
```

2. 安装依赖
```bash
npm install
```

3. 启动本地服务
```bash
npm start
```

4. 打开浏览器访问 `http://localhost:3000`

## 文件结构

```
hearing-signin-system/
├── netlify/
│   └── functions/
│       ├── records.js     # 签到记录API
│       └── stats.js      # 统计信息API
├── public/
│   ├── index.html        # 主页面
│   ├── styles.css        # 样式文件
│   ├── app.js           # 前端逻辑
│   └── qrcode.html      # 二维码生成页面
├── server.js            # 本地开发服务器
├── netlify.toml         # Netlify配置文件
├── package.json         # 项目配置
└── .gitignore          # Git忽略文件
```

## API接口

### 获取签到记录
```
GET /api/records
```

### 提交签到记录
```
POST /api/records
Content-Type: application/json

{
  "name": "张三",
  "phone": "13800138000",
  "location": {
    "lat": 39.908823,
    "lng": 116.397470,
    "address": "北京市东城区天安门广场"
  }
}
```

### 获取统计信息
```
GET /api/stats
```

## 自定义配置

### 修改听证会信息
编辑 `public/index.html` 和 `public/qrcode.html` 中的听证会标题和信息

### 更新二维码链接
在 `public/qrcode.html` 中修改：
```javascript
const qrUrl = 'https://your-domain.netlify.app';
```

### 腾讯地图API密钥
如需更换API密钥，请在 `public/app.js` 中修改：
```javascript
const TENCENT_MAP_KEY = "你的API密钥";
```

## 使用方法

### 管理员操作
1. 打开 `qrcode.html` 生成签到二维码
2. 将二维码展示给参会人员
3. 查看实时签到记录和统计

### 参会人员操作
1. 扫描二维码进入签到页面
2. 填写姓名和手机号
3. 点击获取位置信息
4. 确认信息后提交签到

## 许可证

MIT License

## 支持

如有问题或建议，请提交 Issue 或 Pull Request。