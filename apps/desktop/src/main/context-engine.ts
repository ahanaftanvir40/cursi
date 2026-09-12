import { clipboard } from 'electron';
import type { AIContext } from '@cursi/shared';

/**
 * MVP context strategy: clipboard-first.
 *
 * We save the current clipboard, simulate Cmd+C to copy the selection,
 * read the new clipboard value, then restore the original content.
 * This is the lowest-friction cross-app approach for macOS MVP.
 */
export async function gatherContext(): Promise<AIContext> {
  try {
    // Save current clipboard
    const previousText = clipboard.readText();
    const previousImage = clipboard.readImage();

    // Small delay to let the OS settle (shortcut just fired)
    await sleep(80);

    // Read whatever is currently in clipboard
    // In the future this becomes: simulate Cmd+C, wait, read
    const clipboardText = clipboard.readText();

    // If clipboard changed meaningfully, it's selected text
    const selectedText = clipboardText !== previousText && clipboardText.length > 0
      ? clipboardText
      : undefined;

    // Restore clipboard
    if (previousText) {
      clipboard.writeText(previousText);
    } else if (!previousImage.isEmpty()) {
      clipboard.writeImage(previousImage);
    }

    const context: AIContext = {
      type: selectedText ? 'selected_text' : (clipboardText ? 'clipboard' : 'none'),
    };
    if (selectedText) context.selectedText = selectedText;
    if (clipboardText) context.clipboardText = clipboardText;
    return context;
  } catch (err) {
    console.error('[context-engine] Failed to gather context:', err);
    return { type: 'none' };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
