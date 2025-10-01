import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 递归复制目录的函数
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach((file) => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

console.log('🚀 开始构建 OPFS Explorer...');

try {
  // 清理 dist 目录
  const distDir = path.join(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    console.log('🧹 清理 dist 目录...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  // 运行 Vite 构建
  console.log('📦 运行 Vite 构建...');
  execSync('npm run build:vite', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // 复制 manifest.json 到 dist 目录
  const publicManifest = path.join(__dirname, '../public/manifest.json');
  const distManifest = path.join(__dirname, '../dist/manifest.json');

  if (fs.existsSync(publicManifest)) {
    console.log('📋 复制 manifest.json...');
    fs.copyFileSync(publicManifest, distManifest);
  }

  // 复制 devtools.html 到 dist 目录
  const publicDevtools = path.join(__dirname, '../public/devtools.html');
  const distDevtools = path.join(__dirname, '../dist/devtools.html');

  if (fs.existsSync(publicDevtools)) {
    console.log('🔧 复制 devtools.html...');
    fs.copyFileSync(publicDevtools, distDevtools);
  }

  // 复制 devtools-panel.html 到正确位置
  const srcDevtoolsPanel = path.join(__dirname, '../dist/src/devtools/devtools-panel.html');
  const distDevtoolsPanel = path.join(__dirname, '../dist/devtools-panel.html');

  if (fs.existsSync(srcDevtoolsPanel)) {
    console.log('🔧 复制 devtools-panel.html...');
    fs.copyFileSync(srcDevtoolsPanel, distDevtoolsPanel);
  }

  // 处理图标文件
  const publicIcons = path.join(__dirname, '../public/icons');
  const distIcons = path.join(__dirname, '../dist/icons');

  // 确保 dist/icons 目录存在
  if (!fs.existsSync(distIcons)) {
    fs.mkdirSync(distIcons, { recursive: true });
  }

  if (fs.existsSync(publicIcons)) {
    console.log('🎨 复制图标文件...');
    fs.cpSync(publicIcons, distIcons, { recursive: true });
  }

  // 检查是否有实际的图标文件，如果没有就创建占位符
  // const iconSizes = [16, 32, 48, 128];
  // const hasIcons = iconSizes.some((size) =>
  //   fs.existsSync(path.join(distIcons, `icon-${size}.png`))
  // );

  // if (!hasIcons) {
  //   console.log('🎨 创建占位符图标...');

  //   // 创建最小的有效透明 PNG (1x1 像素)
  //   const pngData = Buffer.from(
  //     'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI/hRg8HgAAAABJRU5ErkJggg==',
  //     'base64'
  //   );

  //   for (const size of iconSizes) {
  //     const iconPath = path.join(distIcons, `icon-${size}.png`);
  //     fs.writeFileSync(iconPath, pngData);
  //   }
  // }

  // 复制 Monaco Editor 的静态资源
  const monacoSrc = path.join(__dirname, '../node_modules/monaco-editor/dev/vs');
  const monacoDest = path.join(__dirname, '../dist/node_modules/monaco-editor/dev/vs');

  if (fs.existsSync(monacoSrc)) {
    console.log('📦 复制 Monaco Editor 资源...');
    copyRecursive(monacoSrc, monacoDest);
  }

  console.log('✅ 构建完成！');
  console.log('📁 输出目录: dist/');
  console.log('🔧 可以在浏览器中加载 dist/ 目录作为插件');
} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}
