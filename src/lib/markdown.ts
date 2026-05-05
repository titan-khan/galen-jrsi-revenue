/**
 * Simple markdown parser for basic formatting
 * Supports: bold, italic, links, lists
 */

export function parseMarkdown(text: string): string {
  if (!text) return '';

  let html = text;

  // Escape HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not in middle of words)
  html = html.replace(/\*([^\s*][^*]*?)\*/g, '<em>$1</em>');
  html = html.replace(/\b_([^\s_][^_]*?)_\b/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  // Bullet lists: - item or * item
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-4">• $1</li>');

  // Numbered lists: 1. item
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4">$1</li>');

  return html;
}

/**
 * Strip markdown formatting to get plain text
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\-\*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '');
}
