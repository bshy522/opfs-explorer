# OPFS Explorer 安装指南

## 快速开始

### 1. 构建插件

```bash
cd packages/opfs-explorer
npm install
npm run build
```

### 2. 在浏览器中加载插件

#### Chrome 浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 启用右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `packages/opfs-explorer/dist` 目录

#### Edge 浏览器

1. 打开 Edge 浏览器
2. 访问 `edge://extensions/`
3. 启用左侧的"开发人员模式"
4. 点击"加载解压缩的扩展"
5. 选择 `packages/opfs-explorer/dist` 目录

### 3. 使用插件

1. 打开浏览器的开发者工具 (F12)
2. 在 DevTools 面板中找到 "OPFS Explorer" 标签页
3. 点击该标签页，将显示文件树和编辑器界面
4. 开始管理您的 OPFS 文件系统！

## 功能说明

### 文件管理

- **浏览文件**: 在左侧文件树中查看 OPFS 中的所有文件和文件夹
- **创建文件**: 点击"新建"按钮创建文件或文件夹
- **删除文件**: 右键点击文件选择删除操作
- **编辑文件**: 点击文件在右侧编辑器中打开

### 代码编辑

- **语法高亮**: 支持多种编程语言的语法高亮
- **自动保存**: 编辑内容会自动保存到 OPFS
- **Monaco Editor**: 基于 VS Code 的强大编辑器

## 浏览器要求

- Chrome 86+ 或 Edge 86+
- 支持 Origin Private File System (OPFS) API
- 支持 Manifest V3

## 故障排除

### 插件无法加载

- 确保浏览器版本支持 OPFS
- 检查控制台是否有错误信息
- 尝试重新构建插件

### OPFS 不可用

- 确保在 HTTPS 环境下使用（localhost 除外）
- 检查浏览器是否支持 OPFS API
- 查看浏览器控制台的错误信息

### 文件操作失败

- 检查文件权限
- 确保文件路径正确
- 查看控制台错误信息

## 开发模式

### 开发环境设置

```bash
npm run dev  # 监听文件变化并自动构建
```

### 调试

1. 在插件管理页面点击"检查视图"
2. 使用浏览器开发者工具调试
3. 查看控制台日志

## 更新插件

1. 重新构建插件：`npm run build`
2. 在插件管理页面点击刷新按钮
3. 或者重新加载插件

## 卸载插件

1. 在插件管理页面找到 OPFS Explorer
2. 点击"移除"按钮
3. 确认删除

---

如有问题，请查看 README.md 或提交 Issue。
