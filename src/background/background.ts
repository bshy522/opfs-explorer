/**
 * 浏览器插件后台脚本
 */

// 插件安装时的处理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('OPFS Explorer 插件已安装', details);

  // 设置默认配置
  chrome.storage.local.set({
    opfsExplorerConfig: {
      theme: 'light',
      autoSave: true,
      fontSize: 14,
    },
  });
});

// 处理来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message, '来自:', sender);

  switch (message.type) {
    case 'GET_CONFIG':
      chrome.storage.local.get(['opfsExplorerConfig'], (result) => {
        sendResponse(result.opfsExplorerConfig || {});
      });
      return true; // 保持消息通道开放以支持异步响应

    case 'SET_CONFIG':
      chrome.storage.local.set(
        {
          opfsExplorerConfig: message.config,
        },
        () => {
          sendResponse({ success: true });
        }
      );
      return true;

    case 'GET_OPFS_INFO':
      // 获取 OPFS 使用情况信息
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage
          .estimate()
          .then((estimate) => {
            sendResponse({
              quota: estimate.quota,
              usage: estimate.usage,
              available: estimate.quota ? estimate.quota - (estimate.usage || 0) : 0,
            });
          })
          .catch((error) => {
            sendResponse({ error: error.message });
          });
      } else {
        sendResponse({ error: '浏览器不支持存储配额 API' });
      }
      return true;

    default:
      console.warn('未知消息类型:', message.type);
      sendResponse({ error: '未知消息类型' });
  }
});

// DevTools 扩展不需要 action.onClicked 事件监听器

// DevTools 扩展不需要监听标签页更新

// 错误处理
chrome.runtime.onStartup.addListener(() => {
  console.log('OPFS Explorer 插件启动');
});

chrome.runtime.onSuspend.addListener(() => {
  console.log('OPFS Explorer 插件暂停');
});

// 导出类型定义（如果需要）
export interface OPFSExplorerConfig {
  theme: 'light' | 'dark';
  autoSave: boolean;
  fontSize: number;
}

export interface OPFSInfo {
  quota: number | undefined;
  usage: number | undefined;
  available: number;
}
