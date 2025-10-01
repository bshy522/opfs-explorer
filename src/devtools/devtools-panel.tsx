import { Layout } from 'antd';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '../components/editor';
import FileTree from '../components/file-tree';
import { AppProvider, useAppContext } from '../contexts/app-context';

// 配置 Monaco Editor 使用本地资源
// 移除了所有自定义配置，让 @monaco-editor/react 使用默认行为

const { Sider, Content } = Layout;

// 简单的错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DevTools 面板错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h3>OPFS Explorer 加载失败</h3>
          <p>错误: {this.state.error?.message}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
            }}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 添加页面关闭前的数据保存处理
const DevToolsPanelContent: React.FC = () => {
  const { state } = useAppContext();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 如果有未保存的编辑内容，提示用户
      if (state.isEditing && state.selectedFileId) {
        // 根据浏览器要求，必须设置 returnValue 才能显示确认对话框
        event.preventDefault();
        event.returnValue = '您有未保存的更改，确定要离开吗？';
        return event.returnValue;
      }
    };

    // 添加 beforeunload 事件监听器
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理事件监听器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.isEditing, state.selectedFileId]);

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        style={{
          background: '#fafafa',
          borderRight: '1px solid #f0f0f0',
        }}
        width={280}
      >
        <FileTree />
      </Sider>
      <Content style={{ padding: 0, background: '#fff' }}>
        <Editor />
      </Content>
    </Layout>
  );
};

const DevToolsPanel: React.FC = () => (
  <ErrorBoundary>
    <AppProvider>
      <DevToolsPanelContent />
    </AppProvider>
  </ErrorBoundary>
);

// 渲染应用
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DevToolsPanel />);
} else {
  console.error('找不到 root 元素');
}
