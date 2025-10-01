/**
 * 插件弹窗主组件
 */

import { ConfigProvider, Layout, Spin } from 'antd';
import type React from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '../components/editor.js';
import FileTree from '../components/file-tree.js';
import { AppProvider, useAppContext } from '../contexts/app-context.js';

const { Sider, Content } = Layout;

// 设计令牌
const designTokens = {
  spacing: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  colors: {
    background: {
      primary: '#ffffff',
    },
    border: {
      light: '#f0f0f0',
    },
  },
  borderRadius: {
    lg: 8,
  },
};

// 布局样式
const layoutStyles = {
  mainLayout: {
    height: '100vh',
    backgroundColor: designTokens.colors.background.primary,
  },
  sider: {
    backgroundColor: designTokens.colors.background.primary,
    borderRight: `1px solid ${designTokens.colors.border.light}`,
    borderRadius: `${designTokens.borderRadius.lg}px 0 0 ${designTokens.borderRadius.lg}px`,
  },
  content: {
    backgroundColor: designTokens.colors.background.primary,
    borderRadius: `0 ${designTokens.borderRadius.lg}px ${designTokens.borderRadius.lg}px 0`,
    overflow: 'hidden',
  },
};

// 加载样式
const loadingStyles = {
  container: {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.colors.background.primary,
  },
  content: {
    textAlign: 'center' as const,
  },
  text: {
    marginTop: designTokens.spacing.md,
    color: '#666',
  },
};

/**
 * 应用内容组件
 */
const AppContent: React.FC = () => {
  const { state } = useAppContext();

  // 显示加载状态
  if (!state.isInitialized) {
    return (
      <Layout style={loadingStyles.container}>
        <div style={loadingStyles.content}>
          <Spin size="large" />
          <div style={loadingStyles.text}>正在初始化 OPFS Explorer...</div>
        </div>
      </Layout>
    );
  }

  // 显示错误状态
  if (state.initializationError) {
    return (
      <Layout style={loadingStyles.container}>
        <div style={loadingStyles.content}>
          <div style={{ color: 'red' }}>初始化失败: {state.initializationError}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={layoutStyles.mainLayout}>
      <Layout style={{ height: '100%', paddingTop: designTokens.spacing.md }}>
        {/* 左侧文件树 */}
        <Sider
          style={{
            ...layoutStyles.sider,
            marginRight: designTokens.spacing.md,
          }}
          width="40%"
        >
          <FileTree />
        </Sider>

        {/* 右侧编辑器区域 */}
        <Content style={layoutStyles.content}>
          <Editor />
        </Content>
      </Layout>
    </Layout>
  );
};

/**
 * 主应用组件
 */
const App: React.FC = () => (
  <AppProvider>
    <ConfigProvider
      theme={{
        components: {
          Tree: {
            indentSize: 24,
          },
        },
      }}
    >
      <AppContent />
    </ConfigProvider>
  </AppProvider>
);

// 渲染应用
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('找不到 root 元素');
}
