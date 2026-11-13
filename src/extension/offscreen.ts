import { createWorker, OEM } from 'tesseract.js';
import type { ExtensionMessage, LanguageCode } from '../shared/types';

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'OCR_RUN') {
    void recognize(message.image, message.languages, message.autoCopy)
      .then(text => sendResponse({ text }))
      .catch(() => sendResponse({ error: 'Не удалось распознать текст. Попробуйте выделить область ещё раз.' }));
    return true;
  }
  if (message.type === 'COPY_TEXT') {
    void navigator.clipboard.writeText(message.text).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ error: 'Не удалось скопировать текст в буфер обмена.' }));
    return true;
  }
  return undefined;
});

async function recognize(imageUrl: string, languages: LanguageCode[], autoCopy: boolean): Promise<string> {
  const worker = await createWorker(languages.join('+') || 'eng', OEM.LSTM_ONLY, {
    workerPath: chrome.runtime.getURL('tesseract/worker.min.js'),
    corePath: chrome.runtime.getURL('tesseract/'),
    langPath: chrome.runtime.getURL('tessdata/'),
    workerBlobURL: false,
    gzip: true
  });

  try {
    const { data: { text } } = await worker.recognize(imageUrl);
    const result = text.trim();
    if (autoCopy && result) await navigator.clipboard.writeText(result);
    return result;
  } finally {
    await worker.terminate();
  }
}
