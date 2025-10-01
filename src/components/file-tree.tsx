/**
 * 文件树组件
 */

import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { TreeProps } from 'antd';
import { Alert, Button, Dropdown, Input, Modal, message, Spin, Tree, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAppContext } from '../contexts/app-context.js';
import type { FileNode } from '../types/index.js';
import StatsPanel from './stats-panel.js';

const { Text } = Typography;

// 复制到剪贴板的工具函数
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('复制到剪贴板失败:', err);
    // 降级方案：使用传统的 document.execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error('降级复制方案也失败:', fallbackErr);
      return false;
    }
  }
};

// 时间常量
const TIME_CONSTANTS = {
  SECOND_MS: 1000,
  MINUTE_MS: 60_000,
  HOUR_MS: 3_600_000,
} as const;

// 样式常量
const STYLE_CONSTANTS = {
  FONT_WEIGHT_MEDIUM: 500,
  OPACITY_DISABLED: 0.6,
  OPACITY_NORMAL: 1,
} as const;

// 设计令牌
const designTokens = {
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    text: {
      secondary: '#8c8c8c',
    },
    background: {
      secondary: '#fafafa',
    },
    border: {
      light: '#f0f0f0',
    },
  },
  fontSize: {
    base: 14,
  },
};

// 紧凑的文件树样式
const fileTreeStyles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#fff',
  },
  header: {
    padding: '8px 12px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
    minHeight: 'auto',
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
    color: '#262626',
  },
  titleIcon: {
    marginRight: 6,
    color: '#faad14',
    fontSize: 12,
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '4px 8px',
    minHeight: 0, // 确保可以收缩
  },
  tree: {
    background: 'transparent',
    fontSize: 12,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    gap: 8,
  },
  loadingText: {
    color: '#8c8c8c',
    fontSize: 12,
  },
  error: {
    margin: 8,
  },
  emptyState: {
    padding: '16px 12px',
    textAlign: 'center' as const,
    color: '#8c8c8c',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    marginBottom: 4,
    fontSize: 13,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#bfbfbf',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 11,
    color: '#bfbfbf',
  },
};

interface FileTreeNodeProps {
  node: FileNode;
  isExpanded: boolean;
  isSelected: boolean;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  getFolderIcon: (isExpanded: boolean) => React.ReactNode;
  getFileIcon: (fileName: string) => React.ReactNode;
  handleCreate: (type: 'file' | 'folder', parentPath?: string) => void;
  handleDelete: (path: string, name: string, type: 'file' | 'folder') => void;
  handleCopyPath: (path: string, name: string) => void;
  handleCopyFileName: (name: string) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = React.memo(
  ({
    node,
    isExpanded,
    isSelected,
    hoveredNodeId,
    setHoveredNodeId,
    getFolderIcon,
    getFileIcon,
    handleCreate,
    handleDelete,
    handleCopyPath,
    handleCopyFileName,
  }) => {
    return (
      <div
        onMouseEnter={() => {
          setHoveredNodeId(node.id);
        }}
        onMouseLeave={() => {
          setHoveredNodeId(null);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <Text
          style={{
            display: 'flex',
            alignItems: 'center',
            color: isSelected ? designTokens.colors.primary : undefined,
            fontWeight: isSelected ? STYLE_CONSTANTS.FONT_WEIGHT_MEDIUM : undefined,
            flex: 1,
            cursor: node.type === 'file' ? 'pointer' : 'default',
            fontSize: 12,
          }}
        >
          {node.type === 'folder' ? getFolderIcon(isExpanded) : getFileIcon(node.name)}
          <span style={{ marginLeft: 6 }}>{node.name}</span>
        </Text>

        {/* 操作下拉菜单 - 只在悬停时显示 */}
        <div
          style={{
            opacity: hoveredNodeId === node.id ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: hoveredNodeId === node.id ? 'auto' : 'none',
          }}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy-path',
                  label: '复制路径',
                  icon: <CopyOutlined />,
                  onClick: () => {
                    handleCopyPath(node.path, node.name);
                  },
                },
                {
                  key: 'copy-name',
                  label: '复制文件名',
                  icon: <CopyOutlined />,
                  onClick: () => {
                    handleCopyFileName(node.name);
                  },
                },
                {
                  type: 'divider' as const,
                },
                ...(node.type === 'folder'
                  ? [
                      {
                        key: 'new-file',
                        label: '新建文件',
                        icon: <FileTextOutlined />,
                        onClick: () => {
                          handleCreate('file', node.path);
                        },
                      },
                      {
                        key: 'new-folder',
                        label: '新建文件夹',
                        icon: <FolderOutlined />,
                        onClick: () => {
                          handleCreate('folder', node.path);
                        },
                      },
                      {
                        type: 'divider' as const,
                      },
                    ]
                  : []),
                {
                  key: 'delete',
                  label: `删除${node.type === 'file' ? '文件' : '文件夹'}`,
                  icon: <DeleteOutlined />,
                  onClick: () => {
                    handleDelete(node.path, node.name, node.type);
                  },
                  danger: true,
                },
              ],
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
              }}
              size="small"
              style={{
                opacity: 0.8,
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
              }}
              title="操作"
              type="text"
            />
          </Dropdown>
        </div>
      </div>
    );
  }
);

FileTreeNode.displayName = 'FileTreeNode';

const FileTree: React.FC = React.memo(() => {
  const { state, opfsService, selectFile, setExpandedFolders } = useAppContext();

  // 文件操作相关状态
  const [isCreating, setIsCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createPath, setCreatePath] = useState('');
  const [createName, setCreateName] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    name: string;
    type: 'file' | 'folder';
  } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const getFileIcon = useCallback((fileName: string) => {
    const fileExtensionMap = {
      '.js': designTokens.colors.primary,
      '.jsx': designTokens.colors.primary,
      '.ts': designTokens.colors.primary,
      '.tsx': designTokens.colors.primary,
      '.html': '#fa8c16',
      '.json': designTokens.colors.success,
      '.md': '#722ed1',
      '.css': '#eb2f96',
    };

    // 检查文件扩展名
    for (const [extension, color] of Object.entries(fileExtensionMap)) {
      if (fileName.endsWith(extension)) {
        return <FileTextOutlined style={{ color }} />;
      }
    }

    // 检查是否包含 config
    if (fileName.includes('config')) {
      return <FileTextOutlined style={{ color: designTokens.colors.warning }} />;
    }

    return <FileTextOutlined style={{ color: designTokens.colors.text.secondary }} />;
  }, []);

  const getFolderIcon = useCallback(
    (isExpanded: boolean) =>
      isExpanded ? (
        <FolderOpenOutlined
          style={{
            color: designTokens.colors.warning,
            fontSize: 14,
          }}
        />
      ) : (
        <FolderOutlined
          style={{
            color: designTokens.colors.warning,
            fontSize: 14,
          }}
        />
      ),
    []
  );

  // 处理刷新
  const handleRefresh = useCallback(async () => {
    if (state.fileTreeRefreshing || state.fileTreeLoading) {
      return; // 防止重复刷新
    }

    try {
      console.log('开始刷新文件树...');
      await opfsService.generateFileTree();
      console.log('文件树刷新成功');
      message.success('文件树刷新成功');
    } catch (err) {
      console.error('刷新文件树失败:', err);
      message.error(`刷新失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }, [state.fileTreeRefreshing, state.fileTreeLoading, opfsService]);

  // 格式化最后刷新时间
  const formatLastRefreshTime = useCallback((time: Date | null) => {
    if (!time) {
      return '';
    }
    const now = new Date();
    const diff = now.getTime() - time.getTime();

    if (diff < TIME_CONSTANTS.SECOND_MS) {
      return '刚刚';
    }
    if (diff < TIME_CONSTANTS.MINUTE_MS) {
      return `${Math.floor(diff / TIME_CONSTANTS.SECOND_MS)}秒前`;
    }
    if (diff < TIME_CONSTANTS.HOUR_MS) {
      return `${Math.floor(diff / TIME_CONSTANTS.MINUTE_MS)}分钟前`;
    }
    return time.toLocaleTimeString();
  }, []);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F5 或 Ctrl+R 刷新文件树
      if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
        event.preventDefault();
        void handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // 处理创建文件/文件夹
  const handleCreate = useCallback((type: 'file' | 'folder', parentPath = '/') => {
    setCreateType(type);
    setCreatePath(parentPath);
    setCreateName('');
    setCreateModalVisible(true);
  }, []);

  // 确认创建
  const handleCreateConfirm = useCallback(async () => {
    if (!createName.trim()) {
      message.error('请输入名称');
      return;
    }

    setIsCreating(true);
    try {
      const fullPath = createPath === '/' ? `/${createName}` : `${createPath}/${createName}`;

      if (createType === 'file') {
        await opfsService.createFile(fullPath, '');
        message.success('文件创建成功');
      } else {
        await opfsService.createFolder(fullPath);
        message.success('文件夹创建成功');
      }

      setCreateModalVisible(false);
      setCreateName('');
    } catch (err) {
      message.error(
        `创建${createType === 'file' ? '文件' : '文件夹'}失败: ${err instanceof Error ? err.message : '未知错误'}`
      );
    } finally {
      setIsCreating(false);
    }
  }, [createName, createPath, createType, opfsService]);

  // 处理删除文件/文件夹
  const handleDelete = useCallback((path: string, name: string, type: 'file' | 'folder') => {
    setDeleteTarget({ path, name, type });
    setDeleteModalVisible(true);
  }, []);

  // 确认删除
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      if (deleteTarget.type === 'file') {
        await opfsService.deleteFile(deleteTarget.path);
        message.success('文件删除成功');
      } else {
        await opfsService.deleteFolder(deleteTarget.path);
        message.success('文件夹删除成功');
      }

      setDeleteModalVisible(false);
      setDeleteTarget(null);
    } catch (err) {
      message.error(
        `删除${deleteTarget.type === 'file' ? '文件' : '文件夹'}失败: ${err instanceof Error ? err.message : '未知错误'}`
      );
    }
  }, [deleteTarget, opfsService]);

  // 复制路径
  const handleCopyPath = useCallback(async (path: string, name: string) => {
    const fullPath = path === '/' ? `/${name}` : `${path}/${name}`;
    const success = await copyToClipboard(fullPath);
    if (success) {
      message.success('路径已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  }, []);

  // 复制文件名
  const handleCopyFileName = useCallback(async (name: string) => {
    const success = await copyToClipboard(name);
    if (success) {
      message.success('文件名已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  }, []);

  // 将FileNode转换为antd的DataNode格式
  const convertToDataNodes = useCallback(
    (nodes: FileNode[]): TreeProps['treeData'] =>
      nodes.map((node: FileNode) => {
        const isExpanded = state.expandedFolders.has(node.id);
        const isSelected = state.selectedFileId === node.id;

        return {
          key: node.id,
          title: (
            <FileTreeNode
              getFileIcon={getFileIcon}
              getFolderIcon={getFolderIcon}
              handleCopyFileName={handleCopyFileName}
              handleCopyPath={handleCopyPath}
              handleCreate={handleCreate}
              handleDelete={handleDelete}
              hoveredNodeId={hoveredNodeId}
              isExpanded={isExpanded}
              isSelected={isSelected}
              node={node}
              setHoveredNodeId={setHoveredNodeId}
            />
          ),
          children:
            node.children && node.children.length > 0 ? convertToDataNodes(node.children) : [],
          isLeaf: node.type === 'file',
        };
      }),
    [
      state.expandedFolders,
      state.selectedFileId,
      hoveredNodeId,
      getFileIcon,
      getFolderIcon,
      handleCreate,
      handleDelete,
      handleCopyPath,
      handleCopyFileName,
    ]
  );

  // 处理树节点选择
  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length > 0) {
        const selectedKey = selectedKeys[0] as string;

        // 查找选中的节点
        const findNode = (nodes: FileNode[], targetId: string): FileNode | null => {
          const stack = [...nodes];
          while (stack.length) {
            const childNode = stack.pop();
            if (!childNode) {
              continue;
            }
            if (childNode.id === targetId) {
              return childNode;
            }
            if (childNode.children) {
              stack.push(...childNode.children);
            }
          }
          return null;
        };

        const selectedNode = findNode(state.fileTree, selectedKey);

        if (selectedNode && selectedNode.type === 'file') {
          // 只处理文件选择，文件夹的展开/收起由 onExpand 处理
          // 调用 context 中的 selectFile 方法更新全局状态
          selectFile(selectedKey);
        }
      }
    },
    [state.fileTree, selectFile]
  );

  // 处理树节点展开/收起
  const handleExpand = useCallback(
    (expandedKeys: React.Key[]) => {
      console.log('文件树展开/收起事件:', expandedKeys);
      // 直接设置展开状态
      const newExpandedKeys = new Set(expandedKeys as string[]);
      console.log('新的展开键集合:', newExpandedKeys);
      // 调用 context 中的 setExpandedFolders 方法更新全局状态
      setExpandedFolders(newExpandedKeys);
      console.log('已更新展开文件夹状态');
    },
    [setExpandedFolders]
  );

  // 使用 useMemo 优化 treeData
  const treeData = useMemo(
    () => convertToDataNodes(state.fileTree),
    [state.fileTree, convertToDataNodes]
  );

  return (
    <>
      <div style={fileTreeStyles.container}>
        {/* Header */}
        <div style={fileTreeStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Text strong style={fileTreeStyles.title}>
                <FolderOutlined style={fileTreeStyles.titleIcon} />
                OPFS Explorer
              </Text>
              {state.lastRefreshTime && (
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>
                  {formatLastRefreshTime(state.lastRefreshTime)}
                </Text>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                icon={<ReloadOutlined />}
                loading={state.fileTreeRefreshing}
                onClick={handleRefresh}
                size="small"
                style={{
                  minWidth: 24,
                  height: 24,
                  padding: '0 6px',
                }}
                title="刷新文件树 (F5)"
                type="text"
              />
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'new-file',
                      label: '新建文件',
                      icon: <FileTextOutlined />,
                      onClick: () => {
                        handleCreate('file', '/');
                      },
                    },
                    {
                      key: 'new-folder',
                      label: '新建文件夹',
                      icon: <FolderOutlined />,
                      onClick: () => {
                        handleCreate('folder', '/');
                      },
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button
                  icon={<PlusOutlined />}
                  size="small"
                  style={{
                    minWidth: 24,
                    height: 24,
                    padding: '0 6px',
                  }}
                  type="text"
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={fileTreeStyles.body}>
          {(() => {
            if (state.fileTreeLoading) {
              return (
                <div style={fileTreeStyles.loading}>
                  <Spin size="small" />
                  <div style={fileTreeStyles.loadingText}>加载中...</div>
                </div>
              );
            }

            if (state.fileTreeError) {
              return (
                <Alert
                  description={state.fileTreeError}
                  message="加载失败"
                  showIcon
                  style={fileTreeStyles.error}
                  type="error"
                />
              );
            }

            // 检查是否已初始化
            if (!state.isInitialized) {
              return (
                <Alert
                  description="OPFS 服务正在初始化中，请稍候..."
                  message="初始化中"
                  showIcon
                  style={fileTreeStyles.error}
                  type="info"
                />
              );
            }

            // 检查文件树是否为空
            console.log('文件树组件渲染 - 当前状态:', {
              fileTree: state.fileTree,
              fileTreeLength: state.fileTree?.length,
              isInitialized: state.isInitialized,
              fileTreeLoading: state.fileTreeLoading,
              fileTreeError: state.fileTreeError,
            });

            if (!state.fileTree || state.fileTree.length === 0) {
              return (
                <div style={fileTreeStyles.emptyState}>
                  <div style={fileTreeStyles.emptyIcon}>📁</div>
                  <div style={fileTreeStyles.emptyTitle}>OPFS 为空</div>
                  <div style={fileTreeStyles.emptySubtitle}>{window.location.hostname}</div>
                  <div style={fileTreeStyles.emptyHint}>点击 + 按钮创建文件或文件夹</div>
                </div>
              );
            }

            return (
              <Tree
                blockNode
                defaultExpandAll={false}
                expandedKeys={Array.from(state.expandedFolders)}
                onExpand={handleExpand}
                onSelect={handleSelect}
                selectable={true}
                selectedKeys={state.selectedFileId ? [state.selectedFileId] : []}
                showIcon={false}
                showLine={{ showLeafIcon: false }}
                style={fileTreeStyles.tree}
                treeData={treeData}
              />
            );
          })()}
        </div>

        {/* 统计面板 */}
        <StatsPanel />
      </div>

      {/* 创建文件/文件夹模态框 */}
      <Modal
        cancelText="取消"
        confirmLoading={isCreating}
        okText="创建"
        onCancel={() => {
          setCreateModalVisible(false);
        }}
        onOk={() => {
          void handleCreateConfirm();
        }}
        open={createModalVisible}
        title={`新建${createType === 'file' ? '文件' : '文件夹'}`}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">路径: {createPath}</Text>
        </div>
        <Input
          autoFocus
          onChange={(e) => {
            setCreateName(e.target.value);
          }}
          onPressEnter={() => {
            void handleCreateConfirm();
          }}
          placeholder={`请输入${createType === 'file' ? '文件' : '文件夹'}名称`}
          value={createName}
        />
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        cancelText="取消"
        okButtonProps={{ danger: true }}
        okText="删除"
        onCancel={() => {
          setDeleteModalVisible(false);
        }}
        onOk={() => {
          void handleDeleteConfirm();
        }}
        open={deleteModalVisible}
        title="确认删除"
      >
        <div>
          <Text>
            确定要删除{deleteTarget?.type === 'file' ? '文件' : '文件夹'}{' '}
            <Text strong>"{deleteTarget?.name}"</Text> 吗？
          </Text>
          {deleteTarget?.type === 'folder' && (
            <div style={{ marginTop: 8 }}>
              <Text type="danger">注意：删除文件夹将同时删除其中的所有文件和子文件夹！</Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
});

FileTree.displayName = 'FileTree';

export default FileTree;
