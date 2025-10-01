/**
 * 应用上下文
 */

import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import { OPFSServiceImpl } from '../services/opfs-service.js';
import type { AppAction, AppContextType, AppState } from '../types/index.js';

// 初始状态
const initialState: AppState = {
  // 文件树状态
  fileTree: [],
  selectedFileId: null,
  expandedFolders: new Set(),
  fileTreeLoading: false,
  fileTreeRefreshing: false,
  fileTreeError: null,
  lastRefreshTime: null,

  // 编辑器状态
  currentFileContent: '',
  isEditing: false,

  // 应用状态
  isInitialized: false,
  initializationError: null,
};

// 状态管理 reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FILE_TREE':
      return { ...state, fileTree: action.payload };

    case 'SET_SELECTED_FILE_ID':
      return { ...state, selectedFileId: action.payload };

    case 'SET_EXPANDED_FOLDERS':
      return { ...state, expandedFolders: action.payload };

    case 'SET_FILE_TREE_LOADING':
      return { ...state, fileTreeLoading: action.payload };

    case 'SET_FILE_TREE_REFRESHING':
      return { ...state, fileTreeRefreshing: action.payload };

    case 'SET_FILE_TREE_ERROR':
      return { ...state, fileTreeError: action.payload };

    case 'SET_LAST_REFRESH_TIME':
      return { ...state, lastRefreshTime: action.payload };

    case 'SET_CURRENT_FILE_CONTENT':
      return { ...state, currentFileContent: action.payload };

    case 'SET_IS_EDITING':
      return { ...state, isEditing: action.payload };

    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'SET_INITIALIZATION_ERROR':
      return { ...state, initializationError: action.payload };

    default:
      return state;
  }
}

// 创建上下文
const AppContext = createContext<AppContextType | null>(null);

// 应用提供者组件
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [opfsService] = React.useState(() => new OPFSServiceImpl());

  // 初始化 OPFS 服务
  useEffect(() => {
    const initializeService = async () => {
      try {
        console.log('开始初始化 OPFS 服务...');
        dispatch({ type: 'SET_INITIALIZATION_ERROR', payload: null });

        // 检查浏览器支持
        console.log('检查浏览器支持:', {
          storage: 'storage' in navigator,
          getDirectory: 'storage' in navigator && 'getDirectory' in navigator.storage,
        });

        await opfsService.initialize();
        console.log('OPFS 服务初始化成功');
        dispatch({ type: 'SET_INITIALIZED', payload: true });

        // 初始化完成后刷新文件树
        console.log('开始刷新文件树...');
        dispatch({ type: 'SET_FILE_TREE_REFRESHING', payload: true });
        dispatch({ type: 'SET_FILE_TREE_ERROR', payload: null });

        try {
          // 直接读取当前页面的 OPFS 文件树
          const newFileTree = await opfsService.generateFileTree();
          console.log('生成的文件树:', newFileTree);
          console.log('文件树长度:', newFileTree.length);
          console.log(
            '当前页面 OPFS 中的文件:',
            newFileTree.map((node) => node.path)
          );

          dispatch({ type: 'SET_FILE_TREE', payload: newFileTree });
          dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date() });
          console.log('文件树刷新完成');
        } catch (err) {
          console.error('刷新文件树失败:', err);
          dispatch({
            type: 'SET_FILE_TREE_ERROR',
            payload: err instanceof Error ? err.message : '刷新失败',
          });
        } finally {
          dispatch({ type: 'SET_FILE_TREE_REFRESHING', payload: false });
        }
      } catch (error) {
        console.error('初始化失败:', error);
        dispatch({
          type: 'SET_INITIALIZATION_ERROR',
          payload: error instanceof Error ? error.message : '初始化失败',
        });
      }
    };

    void initializeService();
  }, [opfsService]);

  // 刷新文件树
  const refreshFileTree = useCallback(async () => {
    if (!opfsService.isInitialized()) {
      return;
    }

    dispatch({ type: 'SET_FILE_TREE_REFRESHING', payload: true });
    dispatch({ type: 'SET_FILE_TREE_ERROR', payload: null });

    try {
      const newFileTree = await opfsService.generateFileTree();
      dispatch({ type: 'SET_FILE_TREE', payload: newFileTree });
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date() });
    } catch (err) {
      dispatch({
        type: 'SET_FILE_TREE_ERROR',
        payload: err instanceof Error ? err.message : '刷新文件树失败',
      });
    } finally {
      dispatch({ type: 'SET_FILE_TREE_REFRESHING', payload: false });
    }
  }, [opfsService]);

  // 选择文件
  const selectFile = useCallback((fileId: string) => {
    dispatch({ type: 'SET_SELECTED_FILE_ID', payload: fileId });
  }, []);

  // 切换文件夹展开状态
  const toggleFolder = useCallback(
    (folderId: string) => {
      const newExpandedFolders = new Set(state.expandedFolders);
      if (newExpandedFolders.has(folderId)) {
        newExpandedFolders.delete(folderId);
      } else {
        newExpandedFolders.add(folderId);
      }
      dispatch({ type: 'SET_EXPANDED_FOLDERS', payload: newExpandedFolders });
    },
    [state.expandedFolders]
  );

  // 设置展开的文件夹
  const setExpandedFolders = useCallback((folders: Set<string>) => {
    dispatch({ type: 'SET_EXPANDED_FOLDERS', payload: new Set(folders) });
  }, []);

  // 读取文件内容
  const readFile = useCallback(
    async (path: string): Promise<string> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('读取文件失败:', path, error);
        throw error;
      }
      try {
        console.log('开始读取文件:', path);
        const content = await opfsService.readFile(path);
        console.log('文件读取成功:', path);
        return content;
      } catch (error) {
        console.error('读取文件失败:', path, error);
        throw error;
      }
    },
    [opfsService]
  );

  // 写入文件
  const writeFile = useCallback(
    async (path: string, content: string): Promise<void> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('写入文件失败:', path, error);
        throw error;
      }
      try {
        console.log('开始写入文件:', path);
        await opfsService.writeFile(path, content);
        console.log('文件写入成功:', path);
        await refreshFileTree();
      } catch (error) {
        console.error('写入文件失败:', path, error);
        throw error;
      }
    },
    [opfsService, refreshFileTree]
  );

  // 节流保存文件
  const saveFileThrottled = useCallback(
    (path: string, content: string) => {
      // 简单的节流实现，实际项目中可以使用更复杂的节流逻辑
      console.log('节流保存文件:', path);
      setTimeout(async () => {
        try {
          await writeFile(path, content);
          // 保存成功后，标记为非编辑状态
          dispatch({ type: 'SET_IS_EDITING', payload: false });
        } catch (error) {
          console.error('保存文件失败:', path, error);
        }
      }, 300);
    },
    [writeFile]
  );

  // 创建文件
  const createFile = useCallback(
    async (path: string, content = ''): Promise<void> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('创建文件失败:', path, error);
        throw error;
      }
      try {
        console.log('开始创建文件:', path);
        await opfsService.createFile(path, content);
        console.log('文件创建成功:', path);
        await refreshFileTree();
      } catch (error) {
        console.error('创建文件失败:', path, error);
        throw error;
      }
    },
    [opfsService, refreshFileTree]
  );

  // 创建文件夹
  const createFolder = useCallback(
    async (path: string): Promise<void> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('创建文件夹失败:', path, error);
        throw error;
      }
      try {
        console.log('开始创建文件夹:', path);
        await opfsService.createFolder(path);
        console.log('文件夹创建成功:', path);
        await refreshFileTree();
      } catch (error) {
        console.error('创建文件夹失败:', path, error);
        throw error;
      }
    },
    [opfsService, refreshFileTree]
  );

  // 删除文件
  const deleteFile = useCallback(
    async (path: string): Promise<void> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('删除文件失败:', path, error);
        throw error;
      }
      try {
        console.log('开始删除文件:', path);
        await opfsService.deleteFile(path);
        console.log('文件删除成功:', path);
        await refreshFileTree();
      } catch (error) {
        console.error('删除文件失败:', path, error);
        throw error;
      }
    },
    [opfsService, refreshFileTree]
  );

  // 删除文件夹
  const deleteFolder = useCallback(
    async (path: string): Promise<void> => {
      if (!opfsService.isInitialized()) {
        const error = new Error('OPFS 未初始化');
        console.error('删除文件夹失败:', path, error);
        throw error;
      }
      try {
        console.log('开始删除文件夹:', path);
        await opfsService.deleteFolder(path);
        console.log('文件夹删除成功:', path);
        await refreshFileTree();
      } catch (error) {
        console.error('删除文件夹失败:', path, error);
        throw error;
      }
    },
    [opfsService, refreshFileTree]
  );

  const contextValue: AppContextType = {
    state,
    dispatch,
    opfsService: {
      ...opfsService,
      generateFileTree: refreshFileTree,
      createFile,
      createFolder,
      deleteFile,
      deleteFolder,
      readFile,
      writeFile,
      saveFileThrottled,
      getDiskUsage: opfsService.getDiskUsage.bind(opfsService),
      getDirectoryStats: opfsService.getDirectoryStats.bind(opfsService),
    },
    selectFile,
    setExpandedFolders,
    toggleFolder,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

// 使用应用上下文的 Hook
export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext 必须在 AppProvider 内部使用');
  }
  return context;
}
