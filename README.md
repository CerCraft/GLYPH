# GLYPH

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-5b8def?style=flat-square)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3) [![Build](https://img.shields.io/badge/Build-Vite-8b5cf6?style=flat-square)](https://github.com/CerCraft/GLYPH)

[English](#english) | [Русский](#русский)

---

## English

**GLYPH** is a lightweight browser extension for Google Chrome and Microsoft Edge designed for local optical character recognition (OCR) from any selected region of a web page. All image processing and text extraction are executed locally on the user's device via Tesseract.js without transmitting data to external servers.

**Repository:** [github.com/CerCraft/GLYPH](https://github.com/CerCraft/GLYPH)

### Key Features

- **Region Capture:** Captures the visible viewport and provides an interactive selection overlay directly over the active page.
- **Multilingual Recognition:** Supports Russian (`rus`), English (`eng`), and simultaneous dual-language recognition (`rus+eng`).
- **Workflow Automation:** Includes optional automatic clipboard copying and an inline preview modal for reviewing and editing extracted text.
- **Customizable Shortcuts:** Triggered via the default `Alt+Shift+S` hotkey or through the extension popup; hotkeys can be reassigned in browser settings.
- **Broad Content Compatibility:** Extracts text from static images, HTML5 `<canvas>` elements, paused video frames, rendered PDF documents, and copy-protected pages.
- **Local Privacy:** Operates completely offline after installation; screenshots and recognized text never leave the local machine.

### Build Instructions

**Prerequisites:** Node.js 20 or higher and npm.

```bash
git clone https://github.com/CerCraft/GLYPH.git
cd GLYPH
npm install
npm run build
```

The build process generates a production-ready `dist/` directory. This directory is excluded from version control as it is deterministically reproduced via `npm run build`. During the initial build, Tesseract language models (`eng` and `rus`), worker scripts, and WebAssembly binaries are cached and bundled into `dist/`, ensuring full offline functionality.

### Installation (Chrome / Edge)

1. Complete the build steps above to generate the `dist/` directory.
2. Navigate to `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Enable **Developer mode** in the upper-right corner.
4. Click **Load unpacked** and select the generated `dist/` folder.
5. Pin **GLYPH** to the browser toolbar for quick access.

### Usage

1. Open any standard web page containing the target text.
2. Press `Alt+Shift+S` or open the **GLYPH** popup and click **Выделить область** (*Select Area*).
3. Drag the cursor across the desired region to define the capture frame. Press `Esc` to cancel the operation.
4. Copy the recognized text from the preview modal. If the preview modal is disabled and auto-copy is active, the text is placed directly into the system clipboard.

**Configuration Options:**
- **Recognition Language:** `Русский + Английский` (Russian + English), `Только русский` (Russian only), or `Только английский` (English only).
- **Auto-Copy to Clipboard:** Automatically copies extracted text upon completion.
- **Preview Window:** Displays an editable modal with the recognized text before or after copying.
- **Shortcut Settings:** Direct link to the browser's extension shortcut configuration page (if `Alt+Shift+S` conflicts with an existing system or browser binding, assign an alternative combination manually).

### Limitations

Due to browser security policies, screen capture is restricted on internal browser pages (`chrome://`, `edge://`, `about:`) and official extension stores. Attempting to invoke GLYPH on these pages will display a corresponding restriction notice.

### Technology Stack

- **Frontend:** React, TypeScript
- **Build System:** Vite, esbuild
- **Extension Architecture:** Chrome Extension Manifest V3
- **OCR Engine:** Tesseract.js (WebAssembly)

---

## Русский

**GLYPH** — компактное расширение для браузеров Google Chrome и Microsoft Edge, предназначенное для локального оптического распознавания символов (OCR) из произвольно выделенной области веб-страницы. Обработка изображений и извлечение текста выполняются исключительно локально на устройстве пользователя с помощью движка Tesseract.js без передачи данных на внешние серверы.

**Репозиторий:** [github.com/CerCraft/GLYPH](https://github.com/CerCraft/GLYPH)

### Основные возможности

- **Захват области экрана:** Создание снимка видимой части вкладки с наложением интерактивной рамки выделения поверх страницы.
- **Многоязычное распознавание:** Поддержка русского (`rus`), английского (`eng`), а также одновременного распознавания обоих языков (`rus+eng`).
- **Автоматизация работы с текстом:** Настраиваемое автоматическое копирование в буфер обмена и компактное окно предпросмотра для проверки и редактирования результата.
- **Настраиваемое управление:** Запуск по сочетанию клавиш `Alt+Shift+S` или через окно расширения; комбинацию клавиш можно изменить в настройках браузера.
- **Универсальность:** Извлечение текста из изображений, элементов HTML5 `<canvas>`, стоп-кадров видео, встроенных PDF-документов и страниц с запретом выделения.
- **Конфиденциальность:** Полностью автономная работа после сборки; снимки экрана и распознанный текст не покидают устройство пользователя.

### Сборка проекта

**Системные требования:** Node.js версии 20 или выше и пакетный менеджер npm.

```bash
git clone https://github.com/CerCraft/GLYPH.git
cd GLYPH
npm install
npm run build
```

В результате выполнения сборки формируется директория `dist/`, готовая к загрузке в браузер. Данная папка исключена из репозитория, так как полностью воспроизводится командой `npm run build`. При первой сборке языковые модели Tesseract (`rus` и `eng`), фоновый обработчик (worker) и ядро WebAssembly кэшируются локально и включаются в состав `dist/`, обеспечивая работу без подключения к сети.

### Установка в Chrome или Edge

1. Выполните инструкции по сборке проекта для получения директории `dist/`.
2. Перейдите по адресу `chrome://extensions` (в Chrome) или `edge://extensions` (в Edge).
3. Активируйте **Режим разработчика** в правом верхнем углу страницы.
4. Нажмите **Загрузить распакованное расширение** и укажите путь к папке `dist/`.
5. Закрепите значок **GLYPH** на панели инструментов браузера.

### Порядок использования

1. Откройте веб-страницу, содержащую необходимый текст.
2. Нажмите сочетание клавиш `Alt+Shift+S` либо откройте меню расширения **GLYPH** и нажмите **Выделить область**.
3. Удерживая кнопку мыши, выделите фрагмент экрана с текстом. Для отмены операции нажмите клавишу `Esc`.
4. Скопируйте распознанный текст из окна предпросмотра. Если окно предпросмотра отключено, текст будет автоматически помещён в буфер обмена (при включённой функции автокопирования).

**Доступные параметры:**
- **Язык текста:** `Русский + Английский`, `Только русский` или `Только английский`.
- **Автокопирование в буфер:** Автоматическая запись распознанного текста в буфер обмена сразу после обработки.
- **Окно предпросмотра:** Отображение всплывающего окна с возможностью просмотреть и скопировать результат.
- **Настроить клавишу:** Переход к системным настройкам горячих клавиш браузера (если комбинация `Alt+Shift+S` занята другим приложением, её необходимо задать вручную).

### Ограничения

В соответствии с политикой безопасности браузеров захват экрана недоступен на внутренних системных страницах (`chrome://`, `edge://`, `about:`), а также в официальных каталогах расширений. При попытке запуска на подобных страницах отображается уведомление об ограничении.

### Технологический стек

- **Интерфейс:** React, TypeScript
- **Сборка:** Vite, esbuild
- **Архитектура расширения:** Chrome Extension Manifest V3
- **Движок распознавания:** Tesseract.js (WebAssembly)
