import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSettings, writeSettings } from '../shared/settings';
import type { LanguageMode, Settings } from '../shared/types';
import './glyph.css';

function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shortcut, setShortcut] = useState('Alt+Shift+S');

  useEffect(() => {
    void readSettings().then(setSettings);
    void chrome.commands.getAll().then(commands => {
      const capture = commands.find(command => command.name === 'capture_screen');
      if (capture) setShortcut(capture.shortcut || 'Не задана');
    });
    void chrome.storage.session.get('captureError').then(async ({ captureError }) => {
      if (typeof captureError === 'string') {
        setError(captureError);
        await chrome.storage.session.remove('captureError');
        await chrome.action.setBadgeText({ text: '' });
        await chrome.action.setTitle({ title: 'GLYPH' });
      }
    });
  }, []);

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
      if (response?.error) {
        setError(response.error);
        setBusy(false);
        return;
      }
      window.close();
    } catch {
      setError('Не удалось начать захват экрана. Перезапустите расширение и попробуйте ещё раз.');
      setBusy(false);
    }
  };

  const update = (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    void writeSettings(next);
  };

  if (!settings) return <main className="popup-shell"><div className="popup"><p className="loading">Загрузка…</p></div></main>;

  return <main className="popup-shell">
    <div className="popup">
      <header className="header"><img className="mark" src={chrome.runtime.getURL('icons/glyph.svg')} alt="" /><div><h1>GLYPH</h1><p>Текст с экрана — локально</p></div></header>
      <button className="primary" onClick={() => void start()} disabled={busy}>
        <span>{busy ? 'Запуск…' : 'Выделить область'}</span><kbd>{shortcut}</kbd>
      </button>
      {error && <p className="error" role="alert">{error}</p>}
      <label className="field-label" id="language-label">Язык текста</label>
      <LanguageDropdown value={settings.languageMode} onChange={languageMode => update({ languageMode })} />
      <label className="toggle-row"><span>Автокопирование</span><input type="checkbox" checked={settings.autoCopy} onChange={event => update({ autoCopy: event.target.checked })} /><span className="switch" /></label>
      <label className="toggle-row"><span>Окно предпросмотра</span><input type="checkbox" checked={settings.showPreview} onChange={event => update({ showPreview: event.target.checked })} /><span className="switch" /></label>
      <button className="shortcut-link" onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>Настроить клавишу <span>↗</span></button>
    </div>
  </main>;
}

const languageOptions: { value: LanguageMode; label: string }[] = [
  { value: 'eng+rus', label: 'Русский + Английский' },
  { value: 'rus', label: 'Только русский' },
  { value: 'eng', label: 'Только английский' }
];

function LanguageDropdown({ value, onChange }: { value: LanguageMode; onChange: (value: LanguageMode) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = languageOptions.findIndex(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open, activeIndex]);

  const focusOption = (index: number) => optionRefs.current[index]?.focus();
  const handleOptionKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption((index + (event.key === 'ArrowDown' ? 1 : languageOptions.length - 1)) % languageOptions.length);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOption(event.key === 'Home' ? 0 : languageOptions.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return <div className="language-select" ref={rootRef}>
    <button
      className="language-trigger"
      ref={triggerRef}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls="language-options"
      aria-labelledby="language-label language-value"
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      <span id="language-value">{languageOptions[activeIndex]?.label}</span>
      <svg className={open ? 'chevron open' : 'chevron'} viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && <div className="language-menu" id="language-options" role="listbox" aria-labelledby="language-label">
      {languageOptions.map((option, index) => <button
        className="language-option"
        key={option.value}
        ref={element => { optionRefs.current[index] = element; }}
        type="button"
        role="option"
        aria-selected={value === option.value}
        onKeyDown={event => handleOptionKey(event, index)}
        onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }}
      >
        <span>{option.label}</span><span className="option-check" aria-hidden="true">{value === option.value ? '✓' : ''}</span>
      </button>)}
    </div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<Popup />);