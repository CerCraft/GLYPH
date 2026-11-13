export type LanguageCode = 'eng' | 'rus';
export type LanguageMode = 'eng+rus' | LanguageCode;

export interface Settings {
  languageMode: LanguageMode;
  autoCopy: boolean;
  showPreview: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  languageMode: 'eng+rus',
  autoCopy: true,
  showPreview: true
};

export type ExtensionMessage =
  | { type: 'START_CAPTURE' }
  | { type: 'SCREENSHOT_READY'; screenshot: string }
  | { type: 'OCR_REQUEST'; image: string }
  | { type: 'OCR_RESULT'; text: string; settings: Settings }
  | { type: 'OCR_ERROR'; message: string }
  | { type: 'OCR_RUN'; image: string; languages: LanguageCode[]; autoCopy: boolean }
  | { type: 'COPY_TEXT'; text: string };