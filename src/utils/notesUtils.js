export function migrateNotesToBlocks(notes) {
  if (!notes) return undefined;
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy plain text — wrap in a paragraph block
  return [{ type: 'paragraph', content: notes }];
}

export function extractPlainText(notes, separator = ' ') {
  if (!notes) return '';
  try {
    const blocks = JSON.parse(notes);
    if (!Array.isArray(blocks)) return notes;
    return blocks
      .map(b => (b.content || []).filter(c => c.type === 'text').map(c => c.text || '').join(''))
      .join(separator)
      .trim();
  } catch {
    return notes;
  }
}
