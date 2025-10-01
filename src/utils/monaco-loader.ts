/**
 * Monaco Editor 加载器
 * 使用 @monaco-editor/loader 加载 Monaco Editor
 */

import loader from '@monaco-editor/loader';

console.log('配置 Monaco Editor loader...');
console.log('当前 URL:', window.location.href);
console.log('当前路径:', window.location.pathname);

const path = chrome.runtime.getURL('node_modules/monaco-editor/dev/vs');

// 配置 Monaco Editor loader
loader.config({
  paths: {
    vs: path,
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn',
    },
  },
});

console.log('Monaco Editor loader 配置完成');
console.log('配置的路径:', {
  vs: path,
  baseUrl: path,
});

let monacoPromise: Promise<typeof import('monaco-editor')> | null = null;

/**
 * 加载 Monaco Editor
 */
export async function loadMonaco(): Promise<typeof import('monaco-editor')> {
  // 如果已经加载过，直接返回
  if (monacoPromise) {
    return monacoPromise;
  }

  console.log('开始初始化 Monaco Editor loader...');
  // 创建加载 Promise
  monacoPromise = loader.init().then((monaco) => monaco.m);
  console.log('Monaco Editor loader.init() 调用完成，等待结果...');
  const monaco = await monacoPromise;
  console.log('Monaco Editor loader.init() 返回结果:', monaco);

  if (!(monaco?.editor && monaco?.languages)) {
    // 验证 monaco 对象是否正确加载
    throw new Error('Monaco Editor 加载失败：返回 undefined');
  }

  // 检查 monaco 对象的结构
  console.log('Monaco Editor 加载成功:', {
    hasEditor: !!monaco.editor,
    hasLanguages: !!monaco.languages,
    typeofEditor: typeof monaco.editor,
    typeofLanguages: typeof monaco.languages,
  });

  return monaco;
}

/**
 * 创建 Monaco Editor 实例
 */
export async function createEditor(
  container: HTMLElement,
  options: import('monaco-editor').editor.IStandaloneEditorConstructionOptions
): Promise<import('monaco-editor').editor.IStandaloneCodeEditor> {
  try {
    const monaco = await loadMonaco();

    // 验证 monaco.editor.create 是否存在
    console.log('验证 Monaco Editor 实例:', {
      hasMonaco: !!monaco,
      hasEditor: !!monaco.editor,
      hasCreate: !!(monaco.editor && typeof monaco.editor.create === 'function'),
      monacoKeys: monaco ? Object.keys(monaco) : [],
      editorKeys: monaco.editor ? Object.keys(monaco.editor) : [],
    });

    if (!monaco) {
      throw new Error('Monaco Editor 未正确加载：monaco 对象不存在');
    }

    if (!monaco.editor) {
      throw new Error('Monaco Editor 未正确加载：editor 对象不存在');
    }

    if (typeof monaco.editor.create !== 'function') {
      throw new Error('Monaco Editor 未正确加载：create 方法不可用');
    }

    console.log('创建 Monaco Editor 实例:', {
      container,
      hasContainer: !!container,
      options,
    });

    return monaco.editor.create(container, options);
  } catch (error) {
    console.error('创建 Monaco Editor 实例失败:', error);
    throw error;
  }
}
