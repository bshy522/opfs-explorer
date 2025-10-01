/**
 * OPFS Explorer 类型定义
 */

// 文件系统相关类型
export interface FileSystemStats {
  isDirectory(): boolean;
  mode?: number;
  type?: string;
}

// 磁盘使用情况类型
export interface DiskUsage {
  quota: number | null;
  usage: number | null;
  available: number | null;
}

// 目录统计信息类型
export interface DirectoryStats {
  fileCount: number;
  folderCount: number;
  totalSize: number;
  path: string;
}

// 文件节点类型
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

// 文件树状态类型
export interface FileTreeState {
  fileTree: FileNode[];
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastRefreshTime: Date | null;
}

// 文件树操作类型
export interface FileTreeActions {
  selectFile: (fileId: string) => void;
  toggleFolder: (folderId: string) => void;
  setExpandedFolders: (folders: Set<string>) => void;
  refreshFileTree: () => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  saveFileThrottled: (path: string, content: string) => void;
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
}

// 文件树 Hook 返回值类型
export interface UseFileTreeReturn extends FileTreeState, FileTreeActions {
  // 别名属性
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// 编辑器组件 Props 类型
export interface EditorProps {
  isResetting?: boolean;
}

// 文件操作结果类型
export interface FileOperationResult {
  success: boolean;
  error?: string;
  message?: string;
}

// OPFS 服务接口
export interface OPFSService {
  // 文件系统操作
  readdir: (path: string) => Promise<string[]>;
  stat: (path: string) => Promise<FileSystemStats>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  unlink: (path: string) => Promise<void>;
  rmdir: (path: string) => Promise<void>;

  // 高级操作
  generateFileTree: () => Promise<FileNode[]>;
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
  emptyDirectory: (path: string) => Promise<void>;

  // 统计信息
  getDiskUsage: () => Promise<DiskUsage>;
  getDirectoryStats: (path: string) => Promise<DirectoryStats>;
}

// 应用状态类型
export interface AppState {
  // 文件树状态
  fileTree: FileNode[];
  selectedFileId: string | null;
  expandedFolders: Set<string>;
  fileTreeLoading: boolean;
  fileTreeRefreshing: boolean;
  fileTreeError: string | null;
  lastRefreshTime: Date | null;

  // 编辑器状态
  currentFileContent: string;
  isEditing: boolean;

  // 应用状态
  isInitialized: boolean;
  initializationError: string | null;
}

// 应用操作类型
export interface AppAction {
  type: string;
  payload?: unknown;
}

// 应用上下文类型
export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  opfsService: OPFSService;
  selectFile: (fileId: string) => void;
  setExpandedFolders: (folders: Set<string>) => void;
  toggleFolder: (folderId: string) => void;
}
