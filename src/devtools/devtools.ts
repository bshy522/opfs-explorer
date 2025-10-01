/**
 * DevTools 脚本
 * 创建 OPFS Explorer 面板
 */

// 创建 DevTools 面板
chrome.devtools.panels.create(
  'OPFS Explorer',
  'icons/icon-16.png',
  'devtools-panel.html',
  (panel) => {
    console.log('OPFS Explorer 面板已创建');

    // 面板显示时的处理
    panel.onShown.addListener((_window) => {
      console.log('OPFS Explorer 面板已显示');
    });

    // 面板隐藏时的处理
    panel.onHidden.addListener(() => {
      console.log('OPFS Explorer 面板已隐藏');
    });
  }
);

// 监听来自面板的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('DevTools 收到消息:', message);

  switch (message.type) {
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

    case 'CLEAR_OPFS':
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        navigator.storage
          .getDirectory()
          .then(async (root) => {
            try {
              // 清空 OPFS 中的所有内容
              for await (const [name] of root.entries()) {
                await root.removeEntry(name, { recursive: true });
              }
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ error: error instanceof Error ? error.message : '清空失败' });
            }
          })
          .catch((error) => {
            sendResponse({ error: error.message });
          });
      } else {
        sendResponse({ error: '浏览器不支持 OPFS' });
      }
      return true;

    default:
      console.warn('DevTools 收到未知消息类型:', message.type);
      sendResponse({ error: '未知消息类型' });
  }
});
