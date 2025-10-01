/**
 * OPFS Explorer 工具函数
 */

import type { FileSystemStats } from '../types/index.js';

// 文件类型常量
const FILE_TYPE_CONSTANTS = {
  DIRECTORY_MODE_MASK: 0o04_0000,
  DIRECTORY_MODE: 0o04_0000,
} as const;

// 文件语言映射
const FILE_LANGUAGE_MAP = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less'],
  json: ['.json'],
  markdown: ['.md', '.markdown'],
  python: ['.py'],
  java: ['.java'],
  cpp: ['.cpp', '.cc', '.cxx', '.c++'],
  c: ['.c'],
  rust: ['.rs'],
  go: ['.go'],
  php: ['.php'],
  ruby: ['.rb'],
  shell: ['.sh', '.bash', '.zsh'],
  yaml: ['.yml', '.yaml'],
  xml: ['.xml'],
  sql: ['.sql'],
} as const;

/**
 * 判断文件系统统计信息是否为目录
 */
export function isDirectory(stat: FileSystemStats, fileName?: string): boolean {
  // 方法1: 检查 isDirectory 是否为函数
  if (typeof stat.isDirectory === 'function') {
    return stat.isDirectory();
  }

  // 方法2: 通过 mode 位运算判断
  if (typeof stat.mode === 'number') {
    return (
      // biome-ignore lint/suspicious/noBitwiseOperators: 文件系统模式位运算判断
      (stat.mode & FILE_TYPE_CONSTANTS.DIRECTORY_MODE_MASK) === FILE_TYPE_CONSTANTS.DIRECTORY_MODE
    );
  }

  // 方法3: 检查 isDirectory 是否为布尔值
  if (typeof stat.isDirectory === 'boolean') {
    return !!stat.isDirectory;
  }

  // 方法4: 检查 type 属性
  if ('type' in stat && stat.type !== undefined) {
    return stat.type === 'directory';
  }

  // 方法5: 通过文件名判断（备选方案）
  if (fileName) {
    return !fileName.includes('.');
  }

  return false;
}

/**
 * 根据文件扩展名获取语言类型
 */
export function getFileLanguage(fileName: string): string {
  const extension = getFileExtension(fileName);

  for (const [language, extensions] of Object.entries(FILE_LANGUAGE_MAP)) {
    if ((extensions as readonly string[]).includes(extension)) {
      return language;
    }
  }

  return 'text';
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * 生成唯一ID
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 清空目录中的所有内容
 */
export async function emptyDirectory(opfsService: unknown, dirPath: string): Promise<void> {
  try {
    // 检查目录是否存在
    const stat = await opfsService.stat(dirPath);
    if (!isDirectory(stat)) {
      throw new Error(`路径不是目录: ${dirPath}`);
    }

    // 读取目录内容
    const files = await opfsService.readdir(dirPath);

    // 删除所有文件和子目录
    for (const file of files) {
      const filePath = dirPath === '/' ? `/${file}` : `${dirPath}/${file}`;
      try {
        const fileStat = await opfsService.stat(filePath);

        if (isDirectory(fileStat)) {
          // 递归删除子目录
          await emptyDirectory(opfsService, filePath);
          await opfsService.rmdir(filePath);
        } else {
          // 删除文件
          await opfsService.unlink(filePath);
        }
      } catch (error: unknown) {
        // 忽略文件不存在的错误
        if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
          console.warn(`删除失败: ${filePath}`, error);
        }
      }
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      // 目录不存在，无需清空
      return;
    }
    console.error(`清空目录失败: ${dirPath}`, error);
    throw error;
  }
}
