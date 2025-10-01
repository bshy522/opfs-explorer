/**
 * 代码编辑器组件
 */

import { CopyOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, message, Tag, Typography } from 'antd';
import React, { useEffect, useRef } from 'react';

import { useAppContext } from '../contexts/app-context.js';
import { formatFileSize, getFileLanguage } from '../utils/index.js';
import { createEditor, loadMonaco } from '../utils/monaco-loader.js';

const { Text, Title } = Typography;

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
  },
  fontSize: {
    base: 14,
  },
};

// 紧凑的样式定义
const editorStyles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 8px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    minHeight: 'auto',
  },
  monacoContainer: {
    flex: 1,
    height: 'calc(100% - 40px)',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  emptyStateContent: {
    textAlign: 'center' as const,
    color: designTokens.colors.text.secondary,
  },
  filePath: {
    fontSize: 11,
    color: '#8c8c8c',
    fontFamily: 'monospace',
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

const iconStyles = {
  emptyStateIcon: {
    fontSize: 32,
    color: designTokens.colors.text.secondary,
    marginBottom: 8,
  },
};

const titleStyles = {
  emptyStateTitle: {
    color: designTokens.colors.text.secondary,
    marginBottom: 4,
    fontSize: 14,
  },
};

const textStyles = {
  secondary: {
    color: designTokens.colors.text.secondary,
  },
  emptyState: {
    color: designTokens.colors.text.secondary,
  },
};

const tagStyles = {
  compact: {
    fontSize: 10,
    padding: '1px 6px',
    height: 'auto',
    lineHeight: '14px',
  },
};

// 配置 Monaco Editor 使用本地资源
// 移除了所有自定义配置，让 @monaco-editor/react 使用默认行为

/**
 * 代码编辑器组件
 */
const Editor: React.FC = () => {
  const [currentFileContent, setCurrentFileContent] = React.useState<string>('');
  const { state, opfsService, dispatch } = useAppContext();
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);

  // 从文件路径中提取文件名
  const selectedFileName = state.selectedFileId
    ? (state.selectedFileId.split('/').pop() ?? '')
    : '';

  // 复制文件路径
  const handleCopyPath = React.useCallback(async () => {
    if (!state.selectedFileId) {
      return;
    }
    const success = await copyToClipboard(state.selectedFileId);
    if (success) {
      message.success('文件路径已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  }, [state.selectedFileId]);

  // 监听文件选择变化，读取文件内容
  React.useEffect(() => {
    const loadFileContent = async () => {
      if (state.selectedFileId) {
        try {
          const content = await opfsService.readFile(state.selectedFileId);
          setCurrentFileContent(content);
        } catch (error) {
          console.error('读取文件内容失败:', error);
          setCurrentFileContent('');
        }
      } else {
        setCurrentFileContent('');
      }
    };

    void loadFileContent();
  }, [state.selectedFileId, opfsService]);

  // 初始化 Monaco Editor
  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      if (!(editorRef.current && state.selectedFileId)) {
        console.log('跳过 Monaco Editor 初始化：', {
          hasEditorRef: !!editorRef.current,
          hasSelectedFile: !!state.selectedFileId,
        });
        return;
      }

      try {
        // 加载 Monaco Editor
        console.log('开始加载 Monaco Editor...');
        const monaco = await loadMonaco();
        console.log('Monaco Editor 加载完成:', {
          hasEditor: !!monaco.editor,
          hasLanguages: !!monaco.languages,
          monacoType: typeof monaco,
          monacoKeys: monaco ? Object.keys(monaco) : [],
        });

        // 如果组件已卸载，直接返回
        if (!isMounted) {
          console.log('组件已卸载，取消初始化');
          return;
        }

        // 检查加载的 Monaco 对象
        if (!monaco?.editor) {
          console.error('Monaco Editor 加载失败：editor 对象不存在');
          return;
        }

        console.log('Monaco Editor 对象验证通过:', {
          hasEditor: !!monaco.editor,
          hasLanguages: !!monaco.languages,
          editorType: typeof monaco.editor,
          languagesType: typeof monaco.languages,
        });

        // 销毁之前的编辑器实例
        if (monacoEditorRef.current) {
          console.log('销毁之前的编辑器实例');
          monacoEditorRef.current.dispose();
          monacoEditorRef.current = null;
        }

        // 创建新的编辑器实例
        console.log('开始创建 Monaco Editor 实例...');
        const editor = await createEditor(editorRef.current, {
          value: currentFileContent,
          language: getFileLanguage(selectedFileName),
          theme: 'vs-dark',
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          padding: { top: 8, bottom: 8 },
          lineHeight: 18,
        });
        console.log('Monaco Editor 实例创建成功');

        // 保存编辑器引用
        monacoEditorRef.current = editor;

        // 监听编辑器内容变化
        console.log('监听编辑器内容变化');
        const disposable = editor.onDidChangeModelContent(() => {
          const value = editor.getValue();
          // 更新本地状态
          setCurrentFileContent(value);

          // 标记为正在编辑
          dispatch({ type: 'SET_IS_EDITING', payload: true });

          // 使用节流保存到文件系统
          const selectedId = state.selectedFileId;
          if (selectedId) {
            opfsService.saveFileThrottled(selectedId, value);
          }
        });

        // 清理函数
        return () => {
          disposable.dispose();
        };
      } catch (error) {
        console.error('初始化 Monaco Editor 失败:', error);
      }
    };

    void initEditor();

    return () => {
      isMounted = false;
      // 清理编辑器实例
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, [state.selectedFileId, currentFileContent, selectedFileName, opfsService, dispatch]);

  // 当文件内容变化时更新编辑器
  useEffect(() => {
    if (monacoEditorRef.current && state.selectedFileId) {
      const editor = monacoEditorRef.current;
      const currentValue = editor.getValue();

      // 只有当内容真正改变时才更新
      if (currentValue !== currentFileContent) {
        editor.setValue(currentFileContent);
      }
    }
  }, [currentFileContent, state.selectedFileId]);

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    }
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
    }
    if (fileName.endsWith('.html')) {
      return <FileTextOutlined style={{ color: '#fa8c16' }} />;
    }
    if (fileName.endsWith('.json')) {
      return <FileTextOutlined style={{ color: '#52c41a' }} />;
    }
    if (fileName.endsWith('.md')) {
      return <FileTextOutlined style={{ color: '#722ed1' }} />;
    }
    if (fileName.endsWith('.css')) {
      return <FileTextOutlined style={{ color: '#eb2f96' }} />;
    }
    if (fileName.includes('config')) {
      return <FileTextOutlined style={{ color: '#faad14' }} />;
    }
    return <FileTextOutlined style={{ color: '#8c8c8c' }} />;
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: designTokens.spacing.md,
        padding: 0,
      }}
    >
      {state.selectedFileId ? (
        <>
          {/* 编辑器头部 */}
          <div style={editorStyles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              {getFileIcon(selectedFileName)}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <Text strong style={{ fontSize: 12, lineHeight: '16px' }}>
                  {selectedFileName}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Text style={editorStyles.filePath} title={state.selectedFileId}>
                    {state.selectedFileId}
                  </Text>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopyPath}
                    size="small"
                    style={{
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      fontSize: 10,
                    }}
                    title="复制路径"
                    type="text"
                  />
                </div>
              </div>
              <Tag color="blue" style={tagStyles.compact}>
                {getFileLanguage(selectedFileName)}
              </Tag>
            </div>
            <Text style={{ fontSize: 11, color: '#8c8c8c' }} type="secondary">
              {formatFileSize(currentFileContent.length)}
            </Text>
          </div>

          {/* Monaco编辑器容器 */}
          <div
            ref={editorRef}
            style={{
              ...editorStyles.monacoContainer,
              minHeight: '200px',
            }}
          />
        </>
      ) : (
        <div style={editorStyles.emptyState}>
          <div style={editorStyles.emptyStateContent}>
            <EditOutlined style={iconStyles.emptyStateIcon} />
            <Title level={4} style={titleStyles.emptyStateTitle}>
              选择文件进行编辑
            </Title>
            <Text style={{ ...textStyles.emptyState, fontSize: 12 }} type="secondary">
              从左侧文件树中选择一个文件开始编辑
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
