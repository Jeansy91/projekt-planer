import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { BlockNoteSchema, defaultBlockSpecs, createCodeBlockSpec } from '@blocknote/core';
import { de, en } from '@blocknote/core/locales';
import { createHighlighter } from 'shiki';
import { migrateNotesToBlocks } from '../utils/notesUtils';
import NotesEditorToolbar from './NotesEditorToolbar';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

const DICTIONARIES = { de, en };

// Shared highlighter — created once and reused across all editor instances
const shikiHighlighter = () => createHighlighter({
  themes: ['github-dark'],
  langs: [
    'angular-html', 'angular-ts', 'bash', 'batch', 'c', 'cpp', 'csharp',
    'css', 'dockerfile', 'go', 'html', 'java', 'javascript', 'json',
    'jsx', 'markdown', 'php', 'python', 'regex', 'ruby', 'rust', 'sh',
    'sql', 'tsx', 'typescript', 'xml', 'yaml', 'zsh'
  ],
});

const SUPPORTED_LANGUAGES = {
  text:           { name: 'Plain text' },
  'angular-html': { name: 'Angular HTML' },
  'angular-ts':   { name: 'Angular TS' },
  bash:           { name: 'Bash', aliases: ['sh', 'shell'] },
  batch:          { name: 'Batch' },
  c:              { name: 'C' },
  cpp:            { name: 'C++', aliases: ['c++'] },
  csharp:         { name: 'C#', aliases: ['cs'] },
  css:            { name: 'CSS' },
  dockerfile:     { name: 'Dockerfile' },
  go:             { name: 'Go' },
  html:           { name: 'HTML' },
  java:           { name: 'Java' },
  javascript:     { name: 'JavaScript', aliases: ['js'] },
  json:           { name: 'JSON' },
  jsx:            { name: 'JSX' },
  markdown:       { name: 'Markdown', aliases: ['md'] },
  php:            { name: 'PHP' },
  python:         { name: 'Python', aliases: ['py'] },
  regex:          { name: 'Regex' },
  ruby:           { name: 'Ruby', aliases: ['rb'] },
  rust:           { name: 'Rust' },
  sql:            { name: 'SQL' },
  tsx:            { name: 'TSX' },
  typescript:     { name: 'TypeScript', aliases: ['ts'] },
  xml:            { name: 'XML' },
  yaml:           { name: 'YAML', aliases: ['yml'] },
  zsh:            { name: 'ZSH' },
};

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({
      defaultLanguage: 'text',
      supportedLanguages: SUPPORTED_LANGUAGES,
      createHighlighter: shikiHighlighter,
    }),
  },
});

// Inner editor — re-mounted on language change because BlockNote bakes the
// dictionary in at construction time. See useCreateBlockNote call below.
const NotesEditorInner = ({ value, onChange, canEdit, dictionary }) => {
  const { t } = useTranslation();
  const patchedDictionary = { ...dictionary, placeholders: { ...dictionary.placeholders, default: t('notes.placeholder') } };
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const saveTimerRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const isResyncingRef = useRef(false);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  // Tracks the last value we saved ourselves so we can skip re-syncing on our own saves
  const lastSelfSavedValue = useRef(value);

  const flushSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    if (pendingSaveRef.current !== null) {
      lastSelfSavedValue.current = pendingSaveRef.current;
      onChangeRef.current(pendingSaveRef.current);
      pendingSaveRef.current = null;
    }
  }, []);

  // Flush on unmount so no edit is lost
  useEffect(() => () => flushSave(), [flushSave]);

  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const editor = useCreateBlockNote({
    schema,
    dictionary: patchedDictionary,
    initialContent: migrateNotesToBlocks(value),
  });

  // Resync editor when notes are changed externally (undo/redo, task switch).
  // Skip if the change originated from our own debounced/blur save.
  useEffect(() => {
    if (value === lastSelfSavedValue.current) return;
    lastSelfSavedValue.current = value;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    pendingSaveRef.current = null;
    const blocks = migrateNotesToBlocks(value) ?? [{ type: 'paragraph', content: [] }];
    try { isResyncingRef.current = true; editor.replaceBlocks(editor.document, blocks); } catch { isResyncingRef.current = false; }
  }, [value, editor]);

  // Called from the toolbar's editor.onChange subscription. Schedules a
  // deferred save — flushed on blur or after 10 s of inactivity.
  const handleEditorChange = useCallback(() => {
    if (isResyncingRef.current) { isResyncingRef.current = false; return; }
    pendingSaveRef.current = JSON.stringify(editor.document);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushSave();
      saveTimerRef.current = null;
    }, 10_000);
  }, [editor, flushSave]);

  return (
    <div
      data-testid="task-notes-editor"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) flushSave(); }}
      className={`task-notes-editor flex-1 flex flex-col min-h-[7.5rem] rounded-lg border transition-colors ${
        canEdit
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-800/30'
          : 'bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600 opacity-75 pointer-events-none'
      }`}
    >
      {canEdit && (
        <NotesEditorToolbar editor={editor} isDark={isDark} onEditorChange={handleEditorChange} />
      )}

      <div className="flex-1 min-h-0 overflow-hidden rounded-b-lg">
        <BlockNoteView
          editor={editor}
          editable={canEdit}
          theme={isDark ? 'dark' : 'light'}
          sideMenu={false}
          formattingToolbar={false}
          slashMenu={false}
        />
      </div>
    </div>
  );
};

// Public wrapper — remounts inner editor when language changes (BlockNote
// dictionary is baked in at construction).
const NotesEditor = ({ value, onChange, canEdit }) => {
  const { i18n } = useTranslation();
  const dictionary = DICTIONARIES[i18n.language] ?? en;
  return (
    <NotesEditorInner
      key={i18n.language}
      value={value}
      onChange={onChange}
      canEdit={canEdit}
      dictionary={dictionary}
    />
  );
};

export default NotesEditor;
