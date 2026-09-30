const ext = globalThis.browser ?? globalThis.chrome;
const apiInput = document.getElementById('api');
const webAppInput = document.getElementById('web-app');
const tokenInput = document.getElementById('token');
const status = document.getElementById('status');

ext.storage.local.get(['apiBase', 'webAppBase', 'companionToken']).then((value) => {
  apiInput.value = value.apiBase ?? 'http://localhost:4000';
  webAppInput.value = value.webAppBase ?? 'http://localhost:5173';
  tokenInput.value = value.companionToken ?? '';
});

document.getElementById('save-settings').addEventListener('click', async () => {
  const apiBase = apiInput.value.trim().replace(/\/$/, '');
  const webAppBase = webAppInput.value.trim().replace(/\/$/, '');
  const companionToken = tokenInput.value.trim();
  await ext.storage.local.set({ apiBase, webAppBase, companionToken });
  status.textContent = 'Connection saved.';
});
