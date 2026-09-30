const ext = globalThis.browser ?? globalThis.chrome;

ext.runtime.onInstalled.addListener(() => {
  ext.contextMenus.create({ id: 'save-job', title: 'Save page to Job Intelligence', contexts: ['page', 'selection', 'link'] });
});

ext.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-job') return;
  const config = await ext.storage.local.get(['apiBase', 'companionToken']);
  if (!config.apiBase || !config.companionToken) return ext.runtime.openOptionsPage();
  const url = info.linkUrl || tab?.url;
  if (!url) return;
  try {
    await fetch(`${config.apiBase}/api/browser-companion/capture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.companionToken}` },
      body: JSON.stringify({ url, pageTitle: tab?.title, selectedText: info.selectionText, action: 'SAVE', private: false }),
    });
  } catch { /* The popup provides visible error handling on the next interaction. */ }
});
