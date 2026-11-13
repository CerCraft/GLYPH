import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ExtensionMessage, Settings } from '../shared/types';

type GlyphWindow = Window & { __glyphOcrLoaded?: boolean };
const pageWindow = window as GlyphWindow;
if (!pageWindow.__glyphOcrLoaded) {
  pageWindow.__glyphOcrLoaded = true;
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'SCREENSHOT_READY') mountOverlay(message.screenshot);
    if (message.type === 'OCR_RESULT') window.dispatchEvent(new CustomEvent('glyph:result', { detail: message }));
    if (message.type === 'OCR_ERROR') window.dispatchEvent(new CustomEvent('glyph:error', { detail: message.message }));
  });
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mountOverlay(screenshot: string) {
  root?.unmount();
  host?.remove();
  host = document.createElement('div');
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  shadow.append(style);
  const mount = document.createElement('div');
  mount.className = 'mount';
  shadow.append(mount);
  document.documentElement.append(host);
  root = createRoot(mount);
  root.render(<SelectionOverlay screenshot={screenshot} onClose={removeOverlay} />);
}

function removeOverlay() {
  root?.unmount();
  root = null;
  host?.remove();
  host = null;
}

function SelectionOverlay({ screenshot, onClose }: { screenshot: string; onClose: () => void }) {
  const [selection, setSelection] = useState<Rect | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [result, setResult] = useState<{ text: string; settings: Settings } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [panel, setPanel] = useState<Point>({ x: 16, y: 58 });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const onResult = (event: Event) => {
      const detail = (event as CustomEvent<{ text: string; settings: Settings }>).detail;
      setBusy(false);
      if (!detail.text.trim()) {
        setMessage('Текст не найден. Выделите область побольше.');
      } else if (detail.settings.showPreview) {
        setResult(detail);
      } else {
        setMessage(detail.settings.autoCopy ? 'Текст скопирован' : 'Текст распознан');
        window.setTimeout(onClose, 1300);
      }
    };
    const onError = (event: Event) => { setBusy(false); setMessage((event as CustomEvent<string>).detail); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('glyph:result', onResult);
    window.addEventListener('glyph:error', onError);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('glyph:result', onResult);
      window.removeEventListener('glyph:error', onError);
    };
  }, [busy, onClose]);

  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (busy || result) return;
    const point = { x: event.clientX, y: event.clientY };
    setStart(point);
    setSelection({ ...point, width: 0, height: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start) return;
    setSelection({
      x: Math.min(start.x, event.clientX), y: Math.min(start.y, event.clientY),
      width: Math.abs(event.clientX - start.x), height: Math.abs(event.clientY - start.y)
    });
  };

  const pointerUp = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start) return;
    const rect = {
      x: Math.min(start.x, event.clientX), y: Math.min(start.y, event.clientY),
      width: Math.abs(event.clientX - start.x), height: Math.abs(event.clientY - start.y)
    };
    setStart(null);
    setSelection(rect);
    if (rect.width < 5 || rect.height < 5) { setSelection(null); return; }
    const cardWidth = Math.min(320, window.innerWidth - 24);
    const cardHeight = Math.min(245, window.innerHeight - 24);
    const left = Math.max(12, Math.min(rect.x, window.innerWidth - cardWidth - 12));
    const below = rect.y + rect.height + 12;
    const top = below + cardHeight <= window.innerHeight - 12 ? below : Math.max(12, rect.y - cardHeight - 12);
    setPanel({ x: left, y: top });
    setBusy(true);
    setMessage('');
    try {
      const image = await cropScreenshot(screenshot, rect);
      await chrome.runtime.sendMessage({ type: 'OCR_REQUEST', image });
    } catch {
      setBusy(false);
      setMessage('Не удалось распознать область. Попробуйте ещё раз.');
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'COPY_TEXT', text: result.text });
      if (response?.error) throw new Error(response.error);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { setMessage('Не удалось скопировать текст.'); }
  };

  const selectionStyle = selection ? {
    left: selection.x, top: selection.y, width: selection.width, height: selection.height,
    backgroundImage: `url("${screenshot}")`, backgroundPosition: `${-selection.x}px ${-selection.y}px`
  } : undefined;

  return <div className="screen-ui">
    <div className="capture-area" style={{ backgroundImage: `linear-gradient(rgba(10, 8, 18, 0.55), rgba(10, 8, 18, 0.55)), url("${screenshot}")` }}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => void pointerUp(event)} onPointerCancel={() => setStart(null)} />
    {selection && !result && <div className="selection-frame" style={selectionStyle}>
      <i className="corner top-left" /><i className="corner top-right" /><i className="corner bottom-left" /><i className="corner bottom-right" />
      <span>{Math.round(selection.width)} × {Math.round(selection.height)}</span>
    </div>}
    {!selection && !busy && !result && <div className="hint">Нажмите Esc для отмены</div>}
    {busy && <div className="status"><span className="spinner" /> Распознавание...</div>}
    {result && <section className="result-card" style={{ left: panel.x, top: panel.y }}>
      <header><span>Распознанный текст</span><button aria-label="Закрыть" title="Закрыть" onClick={onClose}>×</button></header>
      <textarea value={result.text} onChange={event => setResult({ ...result, text: event.target.value })} aria-label="Распознанный текст" spellCheck={false} />
      <footer><button className="copy-button" onClick={() => void copy()}>{copied ? 'Скопировано ✓' : 'Копировать'}</button></footer>
    </section>}
    {message && <div className="notice" role="status">{message}<button aria-label="Закрыть" title="Закрыть" onClick={onClose}>×</button></div>}
  </div>;
}

interface Point { x: number; y: number }
interface Rect extends Point { width: number; height: number }

async function cropScreenshot(dataUrl: string, rect: Rect): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const scaleX = image.naturalWidth / window.innerWidth;
  const scaleY = image.naturalHeight / window.innerHeight;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width * scaleX));
  canvas.height = Math.max(1, Math.round(rect.height * scaleY));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas недоступен.');
  context.drawImage(image, Math.round(rect.x * scaleX), Math.round(rect.y * scaleY), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const styles = `
:host{all:initial}.mount{position:fixed;inset:0;pointer-events:none;font:13px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f3f4f6}.screen-ui{position:absolute;inset:0;pointer-events:none}.capture-area{position:absolute;inset:0;pointer-events:auto;touch-action:none;cursor:crosshair;background-size:100% 100%,100% 100%;background-position:center;background-repeat:no-repeat}.hint,.status{position:fixed;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;padding:8px 11px;background:rgba(20,21,27,.96);backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,.28);border-radius:8px;color:#d1d5db;font-size:11px;white-space:nowrap}.selection-frame{position:fixed;z-index:1;pointer-events:none;border:1.5px solid #8b5cf6;background-size:100vw 100vh;background-repeat:no-repeat}.selection-frame .corner{position:absolute;width:7px;height:7px;border-color:#c4b5fd;border-style:solid}.top-left{left:-1.5px;top:-1.5px;border-width:1.5px 0 0 1.5px}.top-right{right:-1.5px;top:-1.5px;border-width:1.5px 1.5px 0 0}.bottom-left{left:-1.5px;bottom:-1.5px;border-width:0 0 1.5px 1.5px}.bottom-right{right:-1.5px;bottom:-1.5px;border-width:0 1.5px 1.5px 0}.selection-frame>span{position:absolute;top:-26px;right:-1px;padding:4px 7px;background:rgba(20,21,27,.96);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#e5e7eb;font:10px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap}.status{pointer-events:auto}.spinner{width:12px;height:12px;border:1px solid #49424f;border-top-color:#a78bfa;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.result-card{position:fixed;z-index:2;isolation:isolate;pointer-events:auto;width:min(320px,calc(100vw - 24px));height:min(245px,calc(100vh - 24px));display:flex;flex-direction:column;overflow:hidden;background:rgba(24,25,32,.88);backdrop-filter:blur(20px);border:1px solid rgba(139,92,246,.28);border-radius:10px;box-shadow:inset 0 1px rgba(255,255,255,.025),0 12px 30px rgba(0,0,0,.32)}.result-card:before{content:"";position:absolute;z-index:-1;inset:0 0 auto;height:76px;background:radial-gradient(ellipse at 50% 0%,rgba(139,92,246,.12),transparent 80%);pointer-events:none}.result-card header,.result-card footer{height:36px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(255,255,255,.06);color:#d1d5db;font-size:11px}.result-card footer{justify-content:flex-end;border-top:1px solid rgba(255,255,255,.06);border-bottom:0}.result-card button,.notice button{border:0;background:transparent;color:#c4b5fd;font:inherit;cursor:pointer}.result-card header button,.notice button{font-size:18px;line-height:1}.result-card textarea{min-height:0;flex:1;resize:none;margin:8px;padding:8px;background:rgba(20,21,27,.6);border:1px solid rgba(255,255,255,.06);border-radius:8px;outline:none;color:#f3f4f6;font:12px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.result-card textarea:focus{border-color:rgba(139,92,246,.42)}.result-card .copy-button{padding:6px 12px;background:#7c3aed;border:1px solid rgba(167,139,250,.28);border-radius:8px;color:#fff;font-size:11px}.result-card .copy-button:hover{background:#6d28d9}.notice{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);padding:8px 10px;background:rgba(24,25,32,.9);backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,.28);border-radius:8px;color:#e5e7eb;font-size:11px}.notice button{color:#d1d5db}@media(max-width:400px){.hint{top:auto;bottom:14px}}`;