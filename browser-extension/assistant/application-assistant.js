/**
 * Additive helper for the existing Browser Companion popup/content workflow.
 * It never submits a form. It only asks the Job Intelligence API for a draft,
 * then lets the user explicitly insert/accept it.
 */
export async function suggestApplicationField({ apiBase, applicationId, fieldLabel, fieldHelp, token }) {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/career/assistant/field`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ applicationId, fieldLabel, fieldHelp }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message ?? `Assistant request failed (${response.status}).`);
  return body.suggestion;
}

/**
 * Call from an explicit user click. The platform returns the selected CV
 * download endpoint and the external application URL. The extension should
 * start the download first, then open the URL. It must not press Submit.
 */
export async function prepareAndOpenApplication({ apiBase, applicationId, token, downloadsApi, tabsApi }) {
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/career/applications/${applicationId}/launch`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const launch = await response.json();
  if (!response.ok) throw new Error(launch?.message ?? `Launch request failed (${response.status}).`);

  if (launch.cvDownloadPath) {
    await downloadsApi.download({
      url: `${apiBase.replace(/\/$/, '')}${launch.cvDownloadPath}`,
      saveAs: false,
    });
  }
  await tabsApi.create({ url: launch.applyUrl });
  return launch;
}
