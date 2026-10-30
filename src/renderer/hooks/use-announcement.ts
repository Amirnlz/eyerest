import { useEffect, useRef, useState } from 'react';
import { announcementFor } from '../announcements';
import type { OverlayViewModel } from '../view-model';

/**
 * The latest announcement text for a live region. It changes only at milestones, so the region
 * stays quiet between them. The text is set in an effect, after the region has mounted empty:
 * screen readers announce changes to a live region, not content that was there on mount.
 */
export function useAnnouncement(viewModel: OverlayViewModel): string {
  const previous = useRef<OverlayViewModel | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    const next = announcementFor(viewModel, previous.current);
    previous.current = viewModel;
    if (next !== null) setText(next);
  }, [viewModel]);

  return text;
}
