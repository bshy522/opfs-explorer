# OPFS Explorer

OPFS Explorer 是一个浏览器插件，用于管理和编辑 Origin Private File System (OPFS) 中的文件。它提供了直观的文件树界面和强大的代码编辑器，让您可以在浏览器中轻松管理 OPFS 文件系统。

## 功能特性

### 📁 文件管理

- **文件树浏览**: 直观的树形结构显示 OPFS 中的所有文件和文件夹
- **文件操作**: 创建、删除、重命名文件和文件夹
- **拖拽支持**: 支持拖拽操作（计划中）
- **搜索功能**: 快速搜索文件和文件夹（计划中）

### ✏️ 代码编辑

- **Monaco Editor**: 基于 VS Code 的强大代码编辑器
- **语法高亮**: 支持多种编程语言的语法高亮
- **自动保存**: 编辑内容自动保存到 OPFS
- **文件类型识别**: 根据文件扩展名自动识别语言类型

### 🔧 高级功能

- **OPFS 集成**: 完全基于浏览器原生 OPFS API
- **实时同步**: 文件修改实时同步到 OPFS
- **存储管理**: 查看和管理 OPFS 存储使用情况
- **主题支持**: 支持明暗主题切换（计划中）

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI 组件库**: Ant Design
- **代码编辑器**: Monaco Editor
- **构建工具**: Vite
- **浏览器 API**: Origin Private File System (OPFS)

## 浏览器支持

OPFS Explorer 需要支持以下现代浏览器 API：

- **Origin Private File System (OPFS)**: Chrome 86+, Edge 86+
- **File System Access API**: Chrome 86+, Edge 86+
- **Manifest V3**: Chrome 88+, Edge 88+

### 支持的浏览器版本

- ✅ Chrome 86+
- ✅ Edge 86+
- ❌ Firefox (暂不支持 OPFS)
- ❌ Safari (暂不支持 OPFS)

## 安装和开发

### 环境要求

- Node.js 16+
- npm 或 yarn
- 支持 OPFS 的现代浏览器

### 开发环境设置

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd packages/opfs-explorer
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **开发模式**

   ```bash
   npm run dev
   ```

4. **构建插件**
   ```bash
   npm run build
   ```

### 在浏览器中加载插件

1. 打开 Chrome 或 Edge 浏览器
2. 访问 `chrome://extensions/` 或 `edge://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `packages/opfs-explorer/dist` 目录

## 项目结构

```
packages/opfs-explorer/
├── src/
│   ├── components/          # React 组件
│   │   ├── file-tree.tsx   # 文件树组件
│   │   └── editor.tsx      # 代码编辑器组件
│   ├── contexts/           # React 上下文
│   │   └── app-context.tsx # 应用状态管理
│   ├── services/           # 服务层
│   │   └── opfs-service.ts # OPFS 服务实现
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/              # 工具函数
│   │   └── index.ts
│   ├── popup/              # 插件弹窗
│   │   ├── index.html
│   │   └── popup.tsx
│   ├── background/         # 后台脚本
│   │   └── background.ts
│   └── content/            # 内容脚本
│       └── content.ts
├── public/                 # 静态资源
│   ├── manifest.json       # 插件清单
│   └── icons/              # 插件图标
├── dist/                   # 构建输出
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 使用说明

### 基本操作

1. **打开插件**: 打开开发者工具 (F12)，在面板中找到 "OPFS Explorer" 标签页
2. **浏览文件**: 在左侧文件树中浏览 OPFS 中的文件和文件夹
3. **编辑文件**: 点击文件在右侧编辑器中打开
4. **创建文件**: 使用文件树中的"新建"按钮创建文件或文件夹
5. **保存文件**: 编辑内容会自动保存到 OPFS

### 文件操作

- **创建文件**: 右键点击文件夹 → 新建文件
- **创建文件夹**: 右键点击文件夹 → 新建文件夹
- **删除文件**: 右键点击文件 → 删除
- **重命名**: 右键点击文件 → 重命名（计划中）

### 编辑器功能

- **语法高亮**: 根据文件扩展名自动识别语言
- **自动保存**: 编辑内容会在 300ms 后自动保存
- **快捷键**: 支持常见的编辑器快捷键
- **主题**: 默认使用暗色主题

## API 参考

### OPFS 服务

```typescript
interface OPFSService {
  // 文件系统操作
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileSystemStats>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  unlink(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;

  // 高级操作
  generateFileTree(): Promise<FileNode[]>;
  createFile(path: string, content?: string): Promise<void>;
  createFolder(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  deleteFolder(path: string): Promise<void>;
  emptyDirectory(path: string): Promise<void>;
}
```

### 文件节点类型

```typescript
interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
}
```

## 开发计划

### 已完成功能

- ✅ 基础文件树浏览
- ✅ 文件创建和删除
- ✅ 代码编辑器集成
- ✅ OPFS API 集成
- ✅ 自动保存功能

### 计划中的功能

- 🔄 文件重命名
- 🔄 拖拽文件操作
- 🔄 文件搜索
- 🔄 主题切换
- 🔄 文件导入/导出
- 🔄 多标签页编辑
- 🔄 文件历史版本
- 🔄 插件设置页面

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 编写清晰的注释和文档
- 添加适当的错误处理

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 参与讨论

---

**注意**: OPFS Explorer 是一个实验性项目，主要用于演示和学习 OPFS API 的使用。在生产环境中使用前，请确保充分测试所有功能。
