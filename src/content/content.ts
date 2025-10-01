/**
 * 浏览器插件内容脚本
 * 在用户页面中注入，用于与用户页面的 OPFS 交互
 */

// ==================== 类型定义 ====================

interface DirectoryStats {
  fileCount: number;
  folderCount: number;
  totalSize: number;
  path: string;
}

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface MessageResponse {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

// ==================== 核心工具函数 ====================

/**
 * 检查浏览器是否支持 OPFS
 */
function checkOPFSSupport(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * 获取 OPFS 根目录
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!checkOPFSSupport()) {
    console.warn('浏览器不支持 Origin Private File System');
    return null;
  }

  try {
    return await navigator.storage.getDirectory();
  } catch (error) {
    console.error('获取 OPFS 根目录失败:', error);
    return null;
  }
}

/**
 * 导航到指定路径的目录句柄
 */
async function navigateToDirectory(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> {
  const pathParts = path.split('/').filter(Boolean);
  let currentHandle: FileSystemHandle = rootHandle;

  for (const part of pathParts) {
    currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
  }

  return currentHandle as FileSystemDirectoryHandle;
}

/**
 * 获取文件或目录的父目录句柄和名称
 */
async function getParentDirectoryAndName(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<{ parentHandle: FileSystemDirectoryHandle; name: string }> {
  const pathParts = path.split('/').filter(Boolean);
  const name = pathParts.pop() || '';
  const parentPath = pathParts.join('/');

  const parentHandle = parentPath ? await navigateToDirectory(rootHandle, parentPath) : rootHandle;

  return { parentHandle, name };
}

// ==================== 统计计算模块 ====================

/**
 * 递归计算统计信息
 */
async function calculateStatsRecursive(
  dirHandle: FileSystemDirectoryHandle,
  stats: { fileCount: number; folderCount: number; totalSize: number }
): Promise<void> {
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'directory') {
      stats.folderCount++;
      await calculateStatsRecursive(handle, stats);
    } else {
      stats.fileCount++;
      try {
        const file = await handle.getFile();
        stats.totalSize += file.size;
      } catch (error) {
        console.warn(`无法获取文件大小: ${name}`, error);
      }
    }
  }
}

/**
 * 计算目录统计信息
 */
async function calculateDirectoryStats(
  rootHandle: FileSystemDirectoryHandle,
  path: string
): Promise<DirectoryStats> {
  const stats: DirectoryStats = {
    fileCount: 0,
    folderCount: 0,
    totalSize: 0,
    path,
  };

  try {
    const targetHandle = await navigateToDirectory(rootHandle, path);
    await calculateStatsRecursive(targetHandle, stats);
  } catch (error) {
    console.error(`计算目录统计信息失败: ${path}`, error);
    throw new Error(
      `计算目录统计信息失败: ${path} - ${error instanceof Error ? error.message : '未知错误'}`
    );
  }

  return stats;
}

// ==================== 文件树生成模块 ====================

/**
 * 递归读取目录结构
 */
async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  path = '/'
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];

  try {
    for await (const [name, handle] of dirHandle.entries()) {
      const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
      const node: FileNode = {
        id: fullPath,
        name,
        path: fullPath,
        type: handle.kind === 'directory' ? 'folder' : 'file',
      };

      if (handle.kind === 'directory') {
        try {
          node.children = await readDirectoryRecursive(handle, fullPath);
        } catch (childError) {
          console.error(`读取子目录 ${fullPath} 失败:`, childError);
          node.children = [];
        }
      }

      nodes.push(node);
    }
  } catch (error) {
    console.error(`读取目录 ${path} 失败:`, error);
    throw error;
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
}

// ==================== 消息处理器模块 ====================

/**
 * 消息处理器映射
 */
const messageHandlers = {
  CHECK_OPFS_SUPPORT: async (): Promise<MessageResponse> => ({
    success: checkOPFSSupport(),
    pageUrl: window.location.href,
    pageTitle: document.title,
  }),

  READ_OPFS_DIR: async (message: { dirPath: string }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const targetHandle = await navigateToDirectory(root, message.dirPath);
      const entries: string[] = [];

      for await (const [name] of targetHandle.entries()) {
        entries.push(name);
      }

      return { success: true, entries: entries.sort() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取目录失败: 未知错误',
      };
    }
  },

  GET_OPFS_FILE_TREE: async (): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const fileTree = await readDirectoryRecursive(root);
      return {
        success: true,
        fileTree,
        pageUrl: window.location.href,
        pageTitle: document.title,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成文件树失败: 未知错误',
      };
    }
  },

  READ_OPFS_FILE: async (message: { filePath: string }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.filePath);
      const fileHandle = await parentHandle.getFileHandle(name);
      const file = await fileHandle.getFile();
      const content = await file.text();

      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取文件失败: 未知错误',
      };
    }
  },

  WRITE_OPFS_FILE: async (message: {
    filePath: string;
    content: string;
  }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.filePath);
      const fileHandle = await parentHandle.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(message.content);
      await writable.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '写入文件失败: 未知错误',
      };
    }
  },

  CREATE_OPFS_FILE: async (message: {
    filePath: string;
    content: string;
  }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.filePath);
      const fileHandle = await parentHandle.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(message.content);
      await writable.close();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建文件失败: 未知错误',
      };
    }
  },

  CREATE_OPFS_FOLDER: async (message: {
    folderPath: string;
    recursive?: boolean;
  }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.folderPath);
      await parentHandle.getDirectoryHandle(name, { create: true });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建文件夹失败: 未知错误',
      };
    }
  },

  DELETE_OPFS_ITEM: async (message: {
    itemPath: string;
    itemType?: 'file' | 'folder';
  }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.itemPath);
      await parentHandle.removeEntry(name, { recursive: true });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除项目失败: 未知错误',
      };
    }
  },

  GET_OPFS_ROOT: async (): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    return {
      success: true,
      rootHandle: root,
      pageUrl: window.location.href,
      pageTitle: document.title,
    };
  },

  GET_OPFS_STAT: async (message: { itemPath: string }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const { parentHandle, name } = await getParentDirectoryAndName(root, message.itemPath);

      try {
        // 尝试作为文件获取
        await parentHandle.getFileHandle(name);
        return {
          success: true,
          isDirectory: false,
          type: 'file',
          mode: 0o644,
        };
      } catch (_fileError) {
        try {
          // 尝试作为目录获取
          await parentHandle.getDirectoryHandle(name);
          return {
            success: true,
            isDirectory: true,
            type: 'directory',
            mode: 0o755,
          };
        } catch (_dirError) {
          return {
            success: false,
            error: `文件或目录不存在: ${message.itemPath}`,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件/目录状态失败: 未知错误',
      };
    }
  },

  GET_STORAGE_INFO: async (): Promise<MessageResponse> => {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return { success: false, error: '浏览器不支持存储估算' };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota ? estimate.quota - (estimate.usage || 0) : 0,
        pageUrl: window.location.href,
        pageTitle: document.title,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取存储信息失败: 未知错误',
      };
    }
  },

  GET_DIRECTORY_STATS: async (message: { dirPath: string }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const stats = await calculateDirectoryStats(root, message.dirPath);
      return { success: true, stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取目录统计信息失败: 未知错误',
      };
    }
  },

  EMPTY_OPFS_DIRECTORY: async (message: { dirPath: string }): Promise<MessageResponse> => {
    const root = await getOPFSRoot();
    if (!root) {
      return { success: false, error: '无法获取 OPFS 根目录' };
    }

    try {
      const targetHandle = await navigateToDirectory(root, message.dirPath);
      const entries: string[] = [];

      for await (const [name] of targetHandle.entries()) {
        entries.push(name);
      }

      for (const name of entries) {
        try {
          await targetHandle.removeEntry(name, { recursive: true });
        } catch (error) {
          console.error(`删除 ${name} 失败:`, error);
          // 继续删除其他文件
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '清空目录失败: 未知错误',
      };
    }
  },

  CLEAR_OPFS: async (): Promise<MessageResponse> => {
    if (!checkOPFSSupport()) {
      return { success: false, error: '浏览器不支持 OPFS' };
    }

    try {
      const root = await navigator.storage.getDirectory();
      const entries: string[] = [];

      for await (const [name] of root.entries()) {
        entries.push(name);
      }

      for (const name of entries) {
        try {
          await root.removeEntry(name, { recursive: true });
        } catch (error) {
          console.error(`删除 ${name} 失败:`, error);
          // 继续删除其他文件
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '清空 OPFS 失败: 未知错误',
      };
    }
  },
};

// ==================== 消息监听器 ====================

/**
 * 处理来自插件的消息
 */
async function handleMessage(message: {
  type: string;
  [key: string]: unknown;
}): Promise<MessageResponse> {
  const handler = messageHandlers[message.type as keyof typeof messageHandlers];

  if (!handler) {
    return {
      success: false,
      error: '未知消息类型',
      messageType: message.type,
    };
  }

  try {
    return await handler(message);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '处理消息失败: 未知错误',
    };
  }
}

// 监听来自插件的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '处理消息失败: 未知错误',
      });
    });

  return true; // 保持消息通道开放
});

// ==================== 初始化 ====================

/**
 * 页面加载完成后的初始化
 */
function initializeContentScript(): void {
  // 检查 OPFS 支持情况
  if (checkOPFSSupport()) {
    getOPFSRoot()
      .then((root) => {
        if (root) {
          // 可以在这里添加页面特定的 OPFS 操作
          // 比如检测页面是否已经在使用 OPFS
          (async () => {
            try {
              const files: string[] = [];
              for await (const [name] of root.entries()) {
                files.push(name);
              }
              if (files.length > 0) {
                console.log('用户页面的 OPFS 中已有文件:', files);
              }
            } catch (error) {
              console.warn('检查 OPFS 内容失败:', error);
            }
          })();
        }
      })
      .catch((error) => {
        console.warn('初始化 OPFS 检查失败:', error);
      });
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}
