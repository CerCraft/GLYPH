import { DEFAULT_SETTINGS, type LanguageCode, type LanguageMode, type Settings } from './types';

export async function readSettings(): Promise<Settings> {
  const { settings: stored } = await chrome.storage.sync.get('settings');
  const legacy = stored as (Partial<Settings> & { languages?: LanguageCode[]; showFloatingEditor?: boolean }) | undefined;
  const oldLanguages = legacy?.languages ?? [];
  const oldMode = legacy?.languageMode;
  const languageMode: LanguageMode = oldMode === 'eng' || oldMode === 'rus' || oldMode === 'eng+rus'
    ? oldMode
    : oldLanguages.includes('eng') && oldLanguages.includes('rus') ? 'eng+rus'
      : oldLanguages.includes('rus') ? 'rus' : oldLanguages.includes('eng') ? 'eng' : DEFAULT_SETTINGS.languageMode;

  return {
    languageMode,
    autoCopy: typeof legacy?.autoCopy === 'boolean' ? legacy.autoCopy : DEFAULT_SETTINGS.autoCopy,
    showPreview: typeof legacy?.showPreview === 'boolean'
      ? legacy.showPreview
      : typeof legacy?.showFloatingEditor === 'boolean' ? legacy.showFloatingEditor : DEFAULT_SETTINGS.showPreview
  };
}

export async function writeSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ settings });
}