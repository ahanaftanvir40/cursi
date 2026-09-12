import { clipboard } from 'electron';
import type { AIContext } from '@cursi/shared';

/**
 * MVP context strategy: clipboard-first.
 *
 * The user copies text in any app, then presses the shortcut.
 * We read the clipboard immediately — whatever is there is the context.
 */
export async function gatherContext(): Promise<AIContext> {
  try {
    // Read clipboard immediately — user already copied before pressing shortcut
    const clipboardText = clipboard.readText().trim();

    console.log('[context-engine] clipboard text:', JSON.stringify(clipboardText.slice(0, 80)));

    if (clipboardText.length > 0) {
      return {
        type: 'clipboard',
        clipboardText,
      };
    }

    return { type: 'none' };
  } catch (err) {
    console.error('[context-engine] Failed to gather context:', err);
    return { type: 'none' };
  }
}
