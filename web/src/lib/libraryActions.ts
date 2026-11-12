// Shared "Read · Save offline" actions for books a student owns.
// Used by the resources catalogue (All Resources and My Library tabs) so every
// owned e-book behaves exactly the same way, wherever it is shown.
import { getLocalReadingProgress } from './supabase';
import {
  saveBook,
  removeBook,
  getBookMeta,
  keepPagesOffline,
  isOfflineStorageSupported,
  formatSize,
} from './offlineBooks';
import { downloadBook, ReaderError } from './readerApi';

export interface OwnedBook {
  id: string;
  title: string;
}

function readerHref(id: string): string {
  return `/library/read/${id}/`;
}

/** Status line for an owned book, e.g. "Saved offline · Page 8 of 211". */
export async function ownedStatus(book: OwnedBook, userId: string): Promise<{ saved: boolean; text: string }> {
  const meta = await getBookMeta(userId, book.id);
  const progress = getLocalReadingProgress(userId, book.id, '');
  const where = progress && progress.currentPage > 1 ? `Page ${progress.currentPage} of ${progress.totalPages}` : '';
  if (meta) return { saved: true, text: where ? `Saved offline · ${where}` : `Saved offline · ${formatSize(meta.size)}` };
  return { saved: false, text: where || 'In your library' };
}

/**
 * Render the two buttons into `container`, replacing whatever was there.
 * `onChange` lets the caller refresh any status text after save/remove.
 */
export async function renderOwnedActions(
  container: HTMLElement,
  book: OwnedBook,
  userId: string,
  onChange?: () => void,
): Promise<void> {
  const status = await ownedStatus(book, userId);
  const progress = getLocalReadingProgress(userId, book.id, '');
  const readLabel = progress && progress.currentPage > 1 ? 'Continue' : 'Read';

  // Full-width row inside cards (the old area was sized for one small button).
  container.style.width = '100%';
  container.style.alignItems = 'stretch';
  const actionsArea = container.closest('.actions') as HTMLElement | null;
  if (actionsArea) {
    actionsArea.style.flex = '1 1 100%';
    actionsArea.style.marginLeft = '0';
  }

  container.innerHTML = `<div class="lib-actions">
    <a class="lib-btn lib-read" href="${readerHref(book.id)}">${readLabel}</a>
    ${
      status.saved
        ? `<button type="button" class="lib-btn lib-save is-saved" aria-label="Saved offline. Tap to remove from this phone">✓ Saved offline</button>`
        : isOfflineStorageSupported()
          ? `<button type="button" class="lib-btn lib-save">Save offline</button>`
          : ''
    }
    <div class="lib-progress" hidden><div></div></div>
  </div>`;

  const btn = container.querySelector<HTMLButtonElement>('.lib-save');
  btn?.addEventListener('click', async () => {
    if (btn.classList.contains('is-saved')) {
      if (!confirm(`Remove "${book.title}" from this phone? You can save it again any time (uses data).`)) return;
      await removeBook(userId, book.id);
      await renderOwnedActions(container, book, userId, onChange);
      onChange?.();
      return;
    }
    if (!navigator.onLine) {
      btn.textContent = 'No connection';
      return;
    }
    const bar = container.querySelector<HTMLElement>('.lib-progress')!;
    const fill = bar.firstElementChild as HTMLElement;
    bar.hidden = false;
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const file = await downloadBook(book.id, (f) => {
        fill.style.width = f == null ? '40%' : `${Math.round(f * 100)}%`;
        if (f != null) btn.textContent = `Saving… ${Math.round(f * 100)}%`;
      });
      await saveBook({ userId, resourceId: book.id, title: book.title, fileType: file.fileType, version: file.version }, file.bytes);
      void keepPagesOffline([readerHref(book.id), '/resources/']);
      await renderOwnedActions(container, book, userId, onChange);
      onChange?.();
    } catch (err) {
      bar.hidden = true;
      btn.disabled = false;
      const code = err instanceof ReaderError ? err.code : 'failed';
      if (code === 'file_not_uploaded') {
        btn.textContent = 'Coming soon';
        btn.disabled = true;
      } else {
        btn.textContent = code === 'offline' ? 'No connection' : 'Try again';
      }
    }
  });
}
