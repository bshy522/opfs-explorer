/**
 * OPFS 服务实现
 * 基于浏览器 Origin Private File System API
 */

import type {
  DirectoryStats,
  DiskUsage,
  FileNode,
  FileSystemStats,
  OPFSService,
} from '../types/index.js';

export class OPFSServiceImpl implements OPFSService {
  private initialized = false;

  // 消息类型常量
  private static readonly MESSAGE_TYPES = {
    CHECK_OPFS_SUPPORT: 'CHECK_OPFS_SUPPORT',
    READ_OPFS_DIR: 'READ_OPFS_DIR',
    READ_OPFS_FILE: 'READ_OPFS_FILE',
    WRITE_OPFS_FILE: 'WRITE_OPFS_FILE',
    CREATE_OPFS_FILE: 'CREATE_OPFS_FILE',
    CREATE_OPFS_FOLDER: 'CREATE_OPFS_FOLDER',
    DELETE_OPFS_ITEM: 'DELETE_OPFS_ITEM',
    GET_STORAGE_INFO: 'GET_STORAGE_INFO',
    GET_DIRECTORY_STATS: 'GET_DIRECTORY_STATS',
    GET_OPFS_STAT: 'GET_OPFS_STAT',
    GET_OPFS_FILE_TREE: 'GET_OPFS_FILE_TREE',
    EMPTY_OPFS_DIRECTORY: 'EMPTY_OPFS_DIRECTORY',
  } as const;

  /**
   * 初始化 OPFS - 连接到用户当前标签页的 OPFS
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 检查浏览器是否支持 OPFS
      if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
        throw new Error('浏览器不支持 Origin Private File System');
      }

      // 通过 content script 连接到用户页面的 OPFS
      const isConnected = await this.connectToUserPageOPFS();
      if (!isConnected) {
        throw new Error('无法连接到用户页面的 OPFS');
      }

      this.initialized = true;
    } catch (error) {
      console.error('OPFS 初始化失败:', error);
      throw new Error(`OPFS 初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 连接到用户页面的 OPFS
   */
  private async connectToUserPageOPFS(): Promise<boolean> {
    try {
      await this.sendMessageToUserPageUnsafe(OPFSServiceImpl.MESSAGE_TYPES.CHECK_OPFS_SUPPORT);
      return true;
    } catch (error) {
      console.error('用户页面不支持 OPFS 或连接失败:', error);
      return false;
    }
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 确保 OPFS 已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error('OPFS 未初始化，请先调用 initialize() 方法');
    }
  }

  /**
   * 统一的与用户页面通信方法
   */
  private async sendMessageToUserPage<T = unknown>(
    messageType: string,
    payload: Record<string, unknown> = {}
  ): Promise<T> {
    this.ensureInitialized();

    return this.sendMessageToUserPageUnsafe<T>(messageType, payload);
  }

  /**
   * 不检查初始化状态的通信方法（用于初始化过程）
   */
  private async sendMessageToUserPageUnsafe<T = unknown>(
    messageType: string,
    payload: Record<string, unknown> = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('无法获取当前标签页'));
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: messageType,
            ...payload,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              const errorMessage = chrome.runtime.lastError.message || '通信失败';
              console.error(`与用户页面通信失败 (${messageType}):`, errorMessage);
              reject(new Error(`无法与用户页面通信: ${errorMessage}`));
              return;
            }

            if (response?.success !== false && !response?.error) {
              resolve(response);
            } else {
              const errorMessage = response?.error || '操作失败';
              console.error(`操作失败 (${messageType}):`, errorMessage);
              reject(new Error(`${messageType} 失败: ${errorMessage}`));
            }
          }
        );
      });
    });
  }

  /**
   * 读取目录内容 - 获取当前标签页 OPFS 中的文件和文件夹列表
   */
  async readdir(path: string): Promise<string[]> {
    const response = await this.sendMessageToUserPage<{ entries: string[] }>(
      OPFSServiceImpl.MESSAGE_TYPES.READ_OPFS_DIR,
      { dirPath: path }
    );

    return response.entries || [];
  }

  /**
   * 获取文件/目录状态
   */
  async stat(path: string): Promise<FileSystemStats> {
    const response = await this.sendMessageToUserPage<{
      isDirectory: boolean;
      type: 'file' | 'directory';
      mode: number;
    }>(OPFSServiceImpl.MESSAGE_TYPES.GET_OPFS_STAT, { itemPath: path });

    return {
      isDirectory: () => response.isDirectory,
      type: response.type,
      mode: response.mode,
    };
  }

  /**
   * 读取文件内容 - 直接从当前标签页的 OPFS 读取
   */
  async readFile(path: string): Promise<string> {
    const response = await this.sendMessageToUserPage<{ content: string }>(
      OPFSServiceImpl.MESSAGE_TYPES.READ_OPFS_FILE,
      { filePath: path }
    );

    return response.content || '';
  }

  /**
   * 写入文件内容 - 直接写入当前标签页的 OPFS
   */
  async writeFile(path: string, content: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.WRITE_OPFS_FILE, {
      filePath: path,
      content,
    });
  }

  /**
   * 创建目录
   */
  async mkdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.CREATE_OPFS_FOLDER, {
      folderPath: path,
      recursive: options.recursive,
    });
  }

  /**
   * 删除文件 - 从用户页面的 OPFS 中删除
   */
  async unlink(path: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.DELETE_OPFS_ITEM, {
      itemPath: path,
      itemType: 'file',
    });
  }

  /**
   * 删除目录 - 从用户页面的 OPFS 中删除
   */
  async rmdir(path: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.DELETE_OPFS_ITEM, {
      itemPath: path,
      itemType: 'folder',
    });
  }

  /**
   * 生成文件树
   */
  async generateFileTree(): Promise<FileNode[]> {
    if (!this.isInitialized()) {
      return [];
    }

    const response = await this.sendMessageToUserPage<{
      fileTree: FileNode[];
      pageUrl: string;
      pageTitle: string;
    }>(OPFSServiceImpl.MESSAGE_TYPES.GET_OPFS_FILE_TREE);

    return response.fileTree || [];
  }

  /**
   * 创建文件
   */
  async createFile(path: string, content = ''): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.CREATE_OPFS_FILE, {
      filePath: path,
      content,
    });
  }

  /**
   * 创建文件夹
   */
  async createFolder(path: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.CREATE_OPFS_FOLDER, {
      folderPath: path,
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(path: string): Promise<void> {
    await this.deleteItem(path);
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(path: string): Promise<void> {
    await this.deleteItem(path);
  }

  /**
   * 删除文件或文件夹
   */
  async deleteItem(path: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.DELETE_OPFS_ITEM, {
      itemPath: path,
    });
  }

  /**
   * 清空目录
   */
  async emptyDirectory(path: string): Promise<void> {
    await this.sendMessageToUserPage(OPFSServiceImpl.MESSAGE_TYPES.EMPTY_OPFS_DIRECTORY, {
      dirPath: path,
    });
  }

  /**
   * 获取磁盘使用情况
   * 计算当前 OPFS 文件系统的实际使用情况
   */
  async getDiskUsage(): Promise<DiskUsage> {
    const response = await this.sendMessageToUserPage<{
      quota: number | null;
      usage: number | null;
      available: number | null;
    }>(OPFSServiceImpl.MESSAGE_TYPES.GET_STORAGE_INFO);

    return {
      quota: response.quota,
      usage: response.usage,
      available: response.available,
    };
  }

  /**
   * 获取目录统计信息
   */
  async getDirectoryStats(path: string): Promise<DirectoryStats> {
    const response = await this.sendMessageToUserPage<{ stats: DirectoryStats }>(
      OPFSServiceImpl.MESSAGE_TYPES.GET_DIRECTORY_STATS,
      { dirPath: path }
    );

    return response.stats;
  }
}
