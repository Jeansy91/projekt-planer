import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link,
  List, ListOrdered, ListChecks,
  Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  Type, Quote, ChevronDown, Check,
  AlignLeft, AlignCenter, AlignRight,
  Palette, IndentIncrease, IndentDecrease,
  SquarePlus, Table, Code2, SeparatorHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Toolbar UI for the BlockNote editor. Owns dropdown state, click-outside
// dismissal, and the live read of the editor's active styles / block type /
// alignment / nesting capability. Has zero knowledge of save lifecycle —
// that lives in the parent NotesEditor.

const BLOCK_TYPE_GROUPS = [
  {
    key: 'text',
    labelKey: 'notes.toolbar.groups.text',
    items: [
      { key: 'paragraph', labelKey: 'notes.toolbar.blocks.paragraph', icon: Type, type: 'paragraph', props: {} },
    ],
  },
  {
    key: 'headings',
    labelKey: 'notes.toolbar.groups.headings',
    items: [
      { key: 'heading_1', labelKey: 'notes.toolbar.blocks.heading1', icon: Heading1, type: 'heading', props: { level: 1 } },
      { key: 'heading_2', labelKey: 'notes.toolbar.blocks.heading2', icon: Heading2, type: 'heading', props: { level: 2 } },
      { key: 'heading_3', labelKey: 'notes.toolbar.blocks.heading3', icon: Heading3, type: 'heading', props: { level: 3 } },
      { key: 'heading_4', labelKey: 'notes.toolbar.blocks.heading4', icon: Heading4, type: 'heading', props: { level: 4 } },
      { key: 'heading_5', labelKey: 'notes.toolbar.blocks.heading5', icon: Heading5, type: 'heading', props: { level: 5 } },
      { key: 'heading_6', labelKey: 'notes.toolbar.blocks.heading6', icon: Heading6, type: 'heading', props: { level: 6 } },
    ],
  },
  {
    key: 'lists',
    labelKey: 'notes.toolbar.groups.lists',
    items: [
      { key: 'bulletListItem',   labelKey: 'notes.toolbar.blocks.bulletList',   icon: List,        type: 'bulletListItem',   props: {} },
      { key: 'numberedListItem', labelKey: 'notes.toolbar.blocks.numberedList', icon: ListOrdered, type: 'numberedListItem', props: {} },
      { key: 'checkListItem',    labelKey: 'notes.toolbar.blocks.checkList',    icon: ListChecks,  type: 'checkListItem',    props: {} },
    ],
  },
];

const ALL_BLOCK_TYPES = BLOCK_TYPE_GROUPS.flatMap(g => g.items);

const STYLE_BUTTONS = [
  { style: 'bold',      icon: Bold,          titleKey: 'notes.toolbar.styles.bold' },
  { style: 'italic',    icon: Italic,        titleKey: 'notes.toolbar.styles.italic' },
  { style: 'underline', icon: Underline,     titleKey: 'notes.toolbar.styles.underline' },
  { style: 'strike',    icon: Strikethrough, titleKey: 'notes.toolbar.styles.strike' },
  { style: 'code',      icon: Code,          titleKey: 'notes.toolbar.styles.code' },
];

const ALIGN_BUTTONS = [
  { alignment: 'left',   icon: AlignLeft,   titleKey: 'notes.toolbar.align.left' },
  { alignment: 'center', icon: AlignCenter, titleKey: 'notes.toolbar.align.center' },
  { alignment: 'right',  icon: AlignRight,  titleKey: 'notes.toolbar.align.right' },
];

// Mirrors the task color palette; hexLight = -500/-600, hexDark = -400.
const TEXT_COLORS = [
  { name: 'default', labelKey: 'notes.toolbar.colors.default', hexLight: null,      hexDark: null },
  { name: 'slate',   labelKey: 'notes.toolbar.colors.slate',   hexLight: '#64748b', hexDark: '#94a3b8' },
  { name: 'rose',    labelKey: 'notes.toolbar.colors.rose',    hexLight: '#f43f5e', hexDark: '#fb7185' },
  { name: 'orange',  labelKey: 'notes.toolbar.colors.orange',  hexLight: '#ea580c', hexDark: '#fb923c' },
  { name: 'yellow',  labelKey: 'notes.toolbar.colors.yellow',  hexLight: '#ca8a04', hexDark: '#facc15' },
  { name: 'lime',    labelKey: 'notes.toolbar.colors.lime',    hexLight: '#65a30d', hexDark: '#a3e635' },
  { name: 'emerald', labelKey: 'notes.toolbar.colors.emerald', hexLight: '#059669', hexDark: '#34d399' },
  { name: 'cyan',    labelKey: 'notes.toolbar.colors.cyan',    hexLight: '#0891b2', hexDark: '#22d3ee' },
  { name: 'blue',    labelKey: 'notes.toolbar.colors.blue',    hexLight: '#2563eb', hexDark: '#60a5fa' },
  { name: 'violet',  labelKey: 'notes.toolbar.colors.violet',  hexLight: '#7c3aed', hexDark: '#a78bfa' },
  { name: 'fuchsia', labelKey: 'notes.toolbar.colors.fuchsia', hexLight: '#c026d3', hexDark: '#e879f9' },
];

const getBlockTypeKey = (block) => {
  if (!block) return 'paragraph';
  if (block.type === 'heading') return `heading_${block.props?.level ?? 1}`;
  return block.type;
};

const Divider = () => (
  <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 shrink-0" aria-hidden="true" />
);

const NotesEditorToolbar = ({ editor, isDark, onEditorChange }) => {
  const { t } = useTranslation();
  const [activeStyles, setActiveStyles] = useState({});
  const [blockTypeKey, setBlockTypeKey] = useState('paragraph');
  const [textAlignment, setTextAlignment] = useState('left');
  const [canNest, setCanNest] = useState(false);
  const [canUnnest, setCanUnnest] = useState(false);
  const [blockTypeOpen, setBlockTypeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [insertAlign, setInsertAlign] = useState('right');
  const blockTypeRef = useRef(null);
  const colorRef = useRef(null);
  const insertRef = useRef(null);

  useEffect(() => {
    const refreshState = () => {
      setActiveStyles(editor.getActiveStyles());
      const block = editor.getTextCursorPosition()?.block;
      setBlockTypeKey(getBlockTypeKey(block));
      setTextAlignment(block?.props?.textAlignment ?? 'left');
      setCanNest(editor.canNestBlock());
      setCanUnnest(editor.canUnnestBlock());
    };
    const unsubChange = editor.onChange(() => {
      onEditorChange?.();
      refreshState();
    });
    const unsubSel = editor.onSelectionChange(refreshState);
    return () => {
      if (typeof unsubChange === 'function') unsubChange();
      if (typeof unsubSel === 'function') unsubSel();
    };
  }, [editor, onEditorChange]);

  useEffect(() => {
    if (!blockTypeOpen) return;
    const handler = (e) => {
      if (blockTypeRef.current && !blockTypeRef.current.contains(e.target)) setBlockTypeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [blockTypeOpen]);

  useEffect(() => {
    if (!colorOpen) return;
    const handler = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setColorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colorOpen]);

  useEffect(() => {
    if (!insertOpen) return;
    const handler = (e) => {
      if (insertRef.current && !insertRef.current.contains(e.target)) setInsertOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [insertOpen]);

  const handleStyleToggle = useCallback((style) => {
    editor.focus();
    editor.toggleStyles({ [style]: true });
  }, [editor]);

  const handleBlockTypeChange = useCallback((key) => {
    const def = ALL_BLOCK_TYPES.find(b => b.key === key);
    if (!def) return;
    const block = editor.getTextCursorPosition()?.block;
    if (!block) return;
    editor.focus();
    editor.updateBlock(block, { type: def.type, props: def.props });
  }, [editor]);

  const handleAlignmentChange = useCallback((alignment) => {
    const block = editor.getTextCursorPosition()?.block;
    if (!block) return;
    editor.focus();
    editor.updateBlock(block, { props: { textAlignment: alignment } });
  }, [editor]);

  const handleTextColor = useCallback((colorName) => {
    editor.focus();
    if (colorName === 'default') {
      editor.removeStyles({ textColor: true });
    } else {
      editor.addStyles({ textColor: colorName });
    }
  }, [editor]);

  const handleNest = useCallback(() => { editor.focus(); editor.nestBlock(); }, [editor]);
  const handleUnnest = useCallback(() => { editor.focus(); editor.unnestBlock(); }, [editor]);

  const handleLink = useCallback(() => {
    editor.focus();
    const { from, to } = editor.prosemirrorView.state.selection;
    const hasSelection = from !== to;
    editor.createLink('https://', hasSelection ? undefined : 'Link');
  }, [editor]);

  const insertAfterCursor = useCallback((blockSpec) => {
    const block = editor.getTextCursorPosition()?.block
      ?? editor.document[editor.document.length - 1];
    if (!block) return;
    editor.focus();
    editor.insertBlocks([blockSpec], block, 'after');
  }, [editor]);

  const handleInsertQuote     = useCallback(() => insertAfterCursor({ type: 'quote' }), [insertAfterCursor]);
  const handleInsertTable     = useCallback(() => insertAfterCursor({
    type: 'table',
    content: { type: 'tableContent', rows: [{ cells: [[], []] }, { cells: [[], []] }] },
  }), [insertAfterCursor]);
  const handleInsertCodeBlock = useCallback(() => insertAfterCursor({ type: 'codeBlock', props: { language: 'text' } }), [insertAfterCursor]);
  const handleInsertDivider   = useCallback(() => insertAfterCursor({ type: 'divider' }), [insertAfterCursor]);

  const currentBlockType = ALL_BLOCK_TYPES.find(b => b.key === blockTypeKey);
  const BlockTypeIcon = currentBlockType?.icon ?? Type;
  const activeTextColor = activeStyles.textColor ?? 'default';
  const activeColor = TEXT_COLORS.find(c => c.name === activeTextColor);
  const activeColorHex = activeColor ? (isDark ? activeColor.hexDark : activeColor.hexLight) : null;

  return (
    <div className="flex items-center gap-[.1rem] px-2 py-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 shrink-0 flex-wrap rounded-t-lg">

      {/* Block type dropdown */}
      <div className="relative" ref={blockTypeRef}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setBlockTypeOpen(prev => !prev); }}
          aria-label={t('notes.toolbar.blockType')}
          aria-expanded={blockTypeOpen}
          aria-haspopup="listbox"
          className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
        >
          <BlockTypeIcon size={13} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-medium w-[5rem] text-left">{t(currentBlockType?.labelKey ?? 'notes.toolbar.blocks.paragraph')}</span>
          <ChevronDown size={11} className="text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
        </button>

        {blockTypeOpen && (
          <div
            role="listbox"
            aria-label={t('notes.toolbar.blockType')}
            className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-[100] min-w-[11rem] animate-in fade-in zoom-in-95 duration-150 origin-top-left"
          >
            {BLOCK_TYPE_GROUPS.map((group, gi) => (
              <div key={group.key}>
                {gi > 0 && <div className="my-1 border-t border-slate-100 dark:border-slate-700" />}
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2.5 py-1">
                  {t(group.labelKey)}
                </div>
                {group.items.map(({ key, labelKey, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={blockTypeKey === key}
                    onMouseDown={(e) => { e.preventDefault(); handleBlockTypeChange(key); setBlockTypeOpen(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      blockTypeKey === key
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon size={12} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1 text-left">{t(labelKey)}</span>
                    {blockTypeKey === key && <Check size={11} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Inline style buttons */}
      {STYLE_BUTTONS.map(({ style, icon: Icon, titleKey }) => (
        <button
          key={style}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleStyleToggle(style); }}
          title={t(titleKey)}
          aria-label={t(titleKey)}
          aria-pressed={!!activeStyles[style]}
          className={`p-1.5 rounded transition-colors ${
            activeStyles[style]
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Icon size={13} aria-hidden="true" />
        </button>
      ))}

      <Divider />

      {/* Alignment buttons */}
      {ALIGN_BUTTONS.map(({ alignment, icon: Icon, titleKey }) => (
        <button
          key={alignment}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleAlignmentChange(alignment); }}
          title={t(titleKey)}
          aria-label={t(titleKey)}
          aria-pressed={textAlignment === alignment}
          className={`p-1.5 rounded transition-colors ${
            textAlignment === alignment
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Icon size={13} aria-hidden="true" />
        </button>
      ))}

      <Divider />

      {/* Text color dropdown */}
      <div className="relative" ref={colorRef}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setColorOpen(prev => !prev); }}
          title={t('notes.toolbar.colors.label')}
          aria-label={t('notes.toolbar.colors.label')}
          aria-expanded={colorOpen}
          aria-haspopup="listbox"
          className="p-1.5 rounded transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 relative"
        >
          <Palette size={13} aria-hidden="true" />
          {activeColorHex && (
            <span
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-0.5 rounded-full"
              style={{ backgroundColor: activeColorHex }}
              aria-hidden="true"
            />
          )}
        </button>

        {colorOpen && (
          <div
            role="listbox"
            aria-label={t('notes.toolbar.colors.label')}
            className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-[100] min-w-[9rem] animate-in fade-in zoom-in-95 duration-150 origin-top-left"
          >
            {TEXT_COLORS.map(({ name, labelKey, hexLight, hexDark }) => {
              const swatchHex = isDark ? hexDark : hexLight;
              return (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={activeTextColor === name}
                  onMouseDown={(e) => { e.preventDefault(); handleTextColor(name); setColorOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    activeTextColor === name
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-500 shrink-0"
                    style={{ backgroundColor: swatchHex ?? 'transparent' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-left">{t(labelKey)}</span>
                  {activeTextColor === name && <Check size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Divider />

      {/* Nest / Unnest */}
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleUnnest(); }}
        title={t('notes.toolbar.unnest')}
        aria-label={t('notes.toolbar.unnest')}
        disabled={!canUnnest}
        className="p-1.5 rounded transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <IndentDecrease size={13} aria-hidden="true" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); handleNest(); }}
        title={t('notes.toolbar.nest')}
        aria-label={t('notes.toolbar.nest')}
        disabled={!canNest}
        className="p-1.5 rounded transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <IndentIncrease size={13} aria-hidden="true" />
      </button>

      <Divider />

      {/* Insert dropdown */}
      <div className="relative" ref={insertRef}>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setInsertAlign(rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right');
            setInsertOpen(prev => !prev);
          }}
          title={t('notes.toolbar.insert.label')}
          aria-label={t('notes.toolbar.insert.label')}
          aria-expanded={insertOpen}
          aria-haspopup="menu"
          className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <SquarePlus size={13} aria-hidden="true" />
          <ChevronDown size={11} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </button>

        {insertOpen && (
          <div
            role="menu"
            aria-label={t('notes.toolbar.insert.label')}
            className={`absolute top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-[100] min-w-[10rem] animate-in fade-in zoom-in-95 duration-150 ${
              insertAlign === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
            }`}
          >
            {[
              { key: 'link',      labelKey: 'notes.toolbar.insert.link',      icon: Link,                handler: () => { handleLink();            setInsertOpen(false); } },
              { key: 'quote',     labelKey: 'notes.toolbar.blocks.quote',     icon: Quote,               handler: () => { handleInsertQuote();     setInsertOpen(false); } },
              { key: 'table',     labelKey: 'notes.toolbar.insert.table',     icon: Table,               handler: () => { handleInsertTable();     setInsertOpen(false); } },
              { key: 'codeBlock', labelKey: 'notes.toolbar.insert.codeBlock', icon: Code2,               handler: () => { handleInsertCodeBlock(); setInsertOpen(false); } },
              { key: 'divider',   labelKey: 'notes.toolbar.insert.divider',   icon: SeparatorHorizontal, handler: () => { handleInsertDivider();   setInsertOpen(false); } },
            ].map(({ key, labelKey, icon: Icon, handler }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onMouseDown={(e) => { e.preventDefault(); handler(); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Icon size={12} aria-hidden="true" className="shrink-0 text-slate-400 dark:text-slate-500" />
                <span>{t(labelKey)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesEditorToolbar;
