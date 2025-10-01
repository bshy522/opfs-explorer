/**
 * 统计面板组件
 * 显示磁盘使用情况或选中目录的统计信息
 */

import { DatabaseOutlined, FileOutlined, FolderOutlined, HddOutlined } from '@ant-design/icons';
import { Card, Progress, Spin, Typography } from 'antd';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { useAppContext } from '../contexts/app-context.js';
import type { DirectoryStats, DiskUsage } from '../types/index.js';
import { formatFileSize } from '../utils/index.js';

const { Text } = Typography;

// 统计面板样式
const statsPanelStyles = {
  container: {
    borderTop: '1px solid #f0f0f0',
    background: '#fff',
    padding: '8px 12px',
  },
  card: {
    margin: 0,
    boxShadow: 'none',
    border: 'none',
  },
  header: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 600,
    color: '#262626',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 11,
  },
  statLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#8c8c8c',
  },
  statValue: {
    color: '#262626',
    fontWeight: 500,
  },
  progress: {
    marginTop: 4,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
  },
};

const StatsPanel: React.FC = () => {
  const { state, opfsService } = useAppContext();
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null);
  const [directoryStats, setDirectoryStats] = useState<DirectoryStats | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取磁盘使用情况
  const loadDiskUsage = useCallback(async () => {
    try {
      setLoading(true);
      const usage = await opfsService.getDiskUsage();
      setDiskUsage(usage);
    } catch (error) {
      console.error('获取磁盘使用情况失败:', error);
    } finally {
      setLoading(false);
    }
  }, [opfsService]);

  // 获取目录统计信息
  const loadDirectoryStats = useCallback(
    async (path: string) => {
      try {
        setLoading(true);
        const stats = await opfsService.getDirectoryStats(path);
        setDirectoryStats(stats);
      } catch (error) {
        console.error('获取目录统计信息失败:', error);
      } finally {
        setLoading(false);
      }
    },
    [opfsService]
  );

  // 监听选中文件变化和初始化状态
  useEffect(() => {
    // 只有在 OPFS 已初始化时才加载统计信息
    if (!state.isInitialized) {
      return;
    }

    if (state.selectedFileId) {
      // 获取选中文件的父目录路径
      const pathParts = state.selectedFileId.split('/');
      pathParts.pop(); // 移除文件名
      const parentPath = pathParts.length > 1 ? pathParts.join('/') : '/';

      // 如果是文件，统计其父目录；如果是目录，统计其本身
      const targetPath = state.selectedFileId.endsWith('/')
        ? state.selectedFileId.slice(0, -1)
        : parentPath;

      // 同时加载目录统计和磁盘使用情况
      void loadDirectoryStats(targetPath);
      void loadDiskUsage();
    } else {
      // 没有选中文件时，只显示磁盘使用情况
      void loadDiskUsage();
    }
  }, [state.selectedFileId, state.isInitialized, loadDirectoryStats, loadDiskUsage]);

  // 格式化百分比
  const formatPercentage = (used: number, total: number): number => {
    if (total === 0) {
      return 0;
    }
    return Math.round((used / total) * 100);
  };

  // 渲染磁盘使用情况
  const renderDiskUsage = () => {
    if (!diskUsage) {
      return null;
    }

    const { quota, usage, available } = diskUsage;
    const usagePercent = quota && usage ? formatPercentage(usage, quota) : 0;

    return (
      <div style={statsPanelStyles.content}>
        <div style={statsPanelStyles.statItem}>
          <div style={statsPanelStyles.statLabel}>
            <HddOutlined style={{ fontSize: 10 }} />
            <span>OPFS 已用</span>
          </div>
          <Text style={statsPanelStyles.statValue}>{usage ? formatFileSize(usage) : '未知'}</Text>
        </div>

        <div style={statsPanelStyles.statItem}>
          <div style={statsPanelStyles.statLabel}>
            <DatabaseOutlined style={{ fontSize: 10 }} />
            <span>存储配额</span>
          </div>
          <Text style={statsPanelStyles.statValue}>{quota ? formatFileSize(quota) : '未知'}</Text>
        </div>

        {quota && usage && (
          <>
            <div style={statsPanelStyles.statItem}>
              <div style={statsPanelStyles.statLabel}>
                <span>剩余空间</span>
              </div>
              <Text style={statsPanelStyles.statValue}>
                {available ? formatFileSize(available) : '未知'}
              </Text>
            </div>

            <Progress
              percent={usagePercent}
              showInfo={false}
              size="small"
              strokeColor={
                usagePercent > 80 ? '#ff4d4f' : usagePercent > 60 ? '#faad14' : '#52c41a'
              }
              style={statsPanelStyles.progress}
            />
          </>
        )}
      </div>
    );
  };

  // 渲染目录统计信息
  const renderDirectoryStats = () => {
    if (!directoryStats) {
      return null;
    }

    const { fileCount, folderCount, totalSize, path } = directoryStats;

    return (
      <div style={statsPanelStyles.content}>
        <div style={statsPanelStyles.statItem}>
          <div style={statsPanelStyles.statLabel}>
            <FolderOutlined style={{ fontSize: 10 }} />
            <span>文件夹</span>
          </div>
          <Text style={statsPanelStyles.statValue}>{folderCount}</Text>
        </div>

        <div style={statsPanelStyles.statItem}>
          <div style={statsPanelStyles.statLabel}>
            <FileOutlined style={{ fontSize: 10 }} />
            <span>文件</span>
          </div>
          <Text style={statsPanelStyles.statValue}>{fileCount}</Text>
        </div>

        <div style={statsPanelStyles.statItem}>
          <div style={statsPanelStyles.statLabel}>
            <DatabaseOutlined style={{ fontSize: 10 }} />
            <span>总大小</span>
          </div>
          <Text style={statsPanelStyles.statValue}>{formatFileSize(totalSize)}</Text>
        </div>

        <div style={{ ...statsPanelStyles.statItem, marginTop: 2 }}>
          <Text style={{ fontSize: 10, color: '#8c8c8c' }} title={path}>
            {path === '/' ? '根目录' : path}
          </Text>
        </div>
      </div>
    );
  };

  return (
    <div style={statsPanelStyles.container}>
      <Card bodyStyle={{ padding: '8px 0' }} style={statsPanelStyles.card}>
        {(() => {
          if (!state.isInitialized) {
            return (
              <div style={statsPanelStyles.loading}>
                <Text style={{ fontSize: 11 }} type="secondary">
                  OPFS 初始化中...
                </Text>
              </div>
            );
          }
          if (loading) {
            return (
              <div style={statsPanelStyles.loading}>
                <Spin size="small" />
              </div>
            );
          }
          if (state.selectedFileId) {
            return (
              <div style={statsPanelStyles.content}>
                <div style={statsPanelStyles.header}>OPFS 磁盘使用情况</div>
                {renderDiskUsage()}
                <div style={statsPanelStyles.header}>当前目录统计</div>
                {renderDirectoryStats()}
              </div>
            );
          }
          return renderDiskUsage();
        })()}
      </Card>
    </div>
  );
};

export default StatsPanel;
