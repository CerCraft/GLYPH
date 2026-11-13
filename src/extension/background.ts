import { DEFAULT_SETTINGS, type ExtensionMessage } from '../shared/types';
import { readSettings } from '../shared/settings';

chrome.commands.onCommand.addListener(command => {
  if (command === 'capture_screen') void beginCapture().catch(error => rememberCaptureError(errorMessage(error)));
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    void beginCapture().then(() => sendResponse({ ok: true })).catch(error => sendResponse({ error: errorMessage(error) }));
    return true;
  }

  if (message.type === 'OCR_REQUEST' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    void runOcr(message.image, tabId).catch(async error => {
      await chrome.tabs.sendMessage(tabId, { type: 'OCR_ERROR', message: errorMessage(error) }).catch(() => undefined);
    });
  }
  return undefined;
});

async function beginCapture(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) throw new Error('Не удалось получить активную вкладку.');
  const blockedReason = restrictedPageMessage(tab.url);
  if (blockedReason) throw new Error(blockedReason);
  const screenshot = await chrome.tabs.captureVisibleTab(null as unknown as number, { format: 'png' });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  await chrome.tabs.sendMessage(tab.id, { type: 'SCREENSHOT_READY', screenshot });
}

async function runOcr(image: string, tabId: number): Promise<void> {
  const settings = await readSettings();
  await ensureOffscreenDocument();
  const languages = settings.languageMode === 'eng+rus' ? ['eng', 'rus'] as const : [settings.languageMode];
  const result = await chrome.runtime.sendMessage({
    type: 'OCR_RUN', image, languages: [...languages], autoCopy: settings.autoCopy
  });
  if (result?.error) throw new Error(result.error);
  if (typeof result?.text !== 'string') throw new Error('Text recognition failed. Please try again.');
  await chrome.tabs.sendMessage(tabId, { type: 'OCR_RESULT', text: result.text, settings }).catch(() => undefined);
}

function restrictedPageMessage(rawUrl?: string): string | undefined {
  if (!rawUrl) return 'Не удалось определить адрес страницы.';
  let url: URL;
  try { url = new URL(rawUrl); } catch { return 'Не удалось определить адрес страницы.'; }
  const host = url.hostname.toLowerCase();
  if (['chrome:', 'edge:', 'about:', 'devtools:', 'chrome-extension:'].includes(url.protocol)) {
    return 'Недоступно на системных страницах браузера';
  }
  if (host === 'chromewebstore.google.com' || (host === 'chrome.google.com' && url.pathname.startsWith('/webstore'))) {
    return 'Недоступно на системных страницах браузера';
  }
  if (host === 'microsoftedge.microsoft.com' && url.pathname.startsWith('/addons')) {
    return 'Недоступно на системных страницах браузера';
  }
  return undefined;
}

async function rememberCaptureError(message: string): Promise<void> {
  await chrome.storage.session.set({ captureError: message });
  await chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6' });
  await chrome.action.setBadgeText({ text: '!' });
  await chrome.action.setTitle({ title: message });
}

async function ensureOffscreenDocument(): Promise<void> {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html', reasons: ['WORKERS', 'CLIPBOARD'],
      justification: 'Run the local OCR worker and optionally copy recognized text.'
    });
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('Недоступно на системных страницах браузера')) return error.message;
  return 'Не удалось начать захват экрана. Проверьте вкладку и попробуйте ещё раз.';
}