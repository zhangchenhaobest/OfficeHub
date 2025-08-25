# OfficeHub - 开源在线办公平台

![](https://orange.turntip.cn/doc/assets/deploy.gif)

**OfficeHub** 是一款功能强大的 web 版在线办公软件，集成了文档编辑、思维导图、电子表格等多种办公工具，并融入 AI 创作能力，致力于为用户提供高效、便捷的在线协作体验。

## 功能特点

- **多样化办公工具**
    - 在线编辑 doc 文档，支持丰富的格式排版与实时协作
    - 思维导图工具，助力思路梳理与方案规划
    - 电子表格功能，满足数据处理与分析需求

- **AI 创作能力**
    - 内置 AI 辅助创作功能，提升内容生成效率
    - 支持用户自定义 AI 模型，适配个性化需求

- **知识管理**
    - 支持创建自定义模板，统一文档规范
    - 基于文档内容自动生成知识库，便于信息检索与复用

## 技术栈

- **前端**：Vue 3 + TypeScript
- **后端**：Node.js

## 安装与使用

### 前置要求

- Node.js (v14.0.0 及以上)
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆仓库
```bash
git clone git@github.com:MrXujiang/OfficeHub.git
cd OfficeHub
```

2. 安装依赖
```bash
# 安装前端依赖
pnpm install
```

3. 配置环境变量

在 `app` 目录的 `config` 目录下配置必要的环境变量（AI模型的AK、密钥等）

4. 启动应用
```bash
pnpm start
```

5. 访问应用
   
打开浏览器，访问 `http://localhost:3000` 即可使用 OfficeHub

测试密码：
- 用户名：super
- 密码：super_123


后台管理系统访问路径：/fm-busy-admin/

激活码生成访问路径：/fm-busy-admin/generateActiveCode

## 联系方式

如果你有任何问题或建议，欢迎通过以下方式联系我们：
- 微信：cxzk_168
- 邮箱：xujiang156@qq.com
- 微信公众号：趣谈AI

感谢使用 OfficeHub！
