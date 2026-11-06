import { useEffect, useState, useCallback, useRef } from 'react';

export function isSmartTvUserAgent(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const search = window.location.search;
  if (search.includes('tv=1') || search.includes('mode=tv')) return true;
  return /SmartTV|Tizen|Web0S|webOS|AppleTV|Android.*TV|GoogleTV|HbbTV|CrKey|Viera|BRAVIA|Silk|AmazonWebAppPlatform|Airtel|Xstream|AFTB|AFTM|AFTT|MiBox|SHIELD|TV Bro|JioPages|Puffin/i.test(
    ua
  );
}

export function useTvMode() {
  const [isTvMode, setIsTvMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('tv=1')) {
      try {
        localStorage.setItem('cinestream_tv_mode', 'true');
      } catch {}
      return true;
    }
    try {
      const saved = localStorage.getItem('cinestream_tv_mode');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return isSmartTvUserAgent();
  });

  const toggleTvMode = useCallback(() => {
    setIsTvMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cinestream_tv_mode', String(next));
      } catch {}
      return next;
    });
  }, []);

  return { isTvMode, toggleTvMode, setIsTvMode };
}

export interface TvKeyHandlers {
  onBack?: () => void;
  onMenu?: () => void;
  onFullscreen?: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onNextServer?: () => void;
  onToggleQuality?: () => void;
  onVoiceSearch?: () => void;
}

export function useTvHotkeys(handlers: TvKeyHandlers, enabled = true) {
  // Intercept browser history back (Android TV / Airtel Xstream remote physical Back button)
  useEffect(() => {
    if (!enabled) return;

    try {
      window.history.pushState({ cinestreamTvGuard: true }, '');
    } catch {}

    const handlePopState = () => {
      if (handlers.onBack) {
        handlers.onBack();
      }
      try {
        window.history.pushState({ cinestreamTvGuard: true }, '');
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlers, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        (target as HTMLInputElement).type !== 'range';

      const keyCode = e.keyCode || e.which;

      if (isInput) {
        if (
          e.key === 'Escape' ||
          e.key === 'GoBack' ||
          e.key === 'BrowserBack' ||
          keyCode === 4 ||
          keyCode === 27
        ) {
          e.preventDefault();
          target.blur();
        }
        return;
      }

      // 1. Remote BACK Button (Android TV, Airtel Xstream, Tizen, WebOS, Standard)
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'GoBack' ||
        e.key === 'BrowserBack' ||
        e.key === 'XF86Back' ||
        keyCode === 4 ||
        keyCode === 8 ||
        keyCode === 27 ||
        keyCode === 461 ||
        keyCode === 10009
      ) {
        if (handlers.onBack) {
          e.preventDefault();
          handlers.onBack();
        }
        return;
      }

      // 2. Remote MENU / GUIDE / INFO Button
      if (
        e.key === 'ContextMenu' ||
        e.key === 'Menu' ||
        e.key === 'Info' ||
        e.key === 'Guide' ||
        e.key === 'F1' ||
        e.key === 'g' ||
        e.key === 'G' ||
        keyCode === 82 ||
        keyCode === 165 ||
        keyCode === 457
      ) {
        if (handlers.onMenu) {
          e.preventDefault();
          handlers.onMenu();
        }
        return;
      }

      switch (e.key) {
        case 'f':
        case 'F':
          if (handlers.onFullscreen) {
            e.preventDefault();
            handlers.onFullscreen();
          }
          break;
        case 'n':
        case 'N':
        case 'ChannelUp':
        case 'MediaTrackNext':
          if (handlers.onNextEpisode) {
            e.preventDefault();
            handlers.onNextEpisode();
          }
          break;
        case 'p':
        case 'P':
        case 'ChannelDown':
        case 'MediaTrackPrevious':
          if (handlers.onPrevEpisode) {
            e.preventDefault();
            handlers.onPrevEpisode();
          }
          break;
        case 's':
        case 'S':
        case 'ColorF0Red':
          if (handlers.onNextServer) {
            e.preventDefault();
            handlers.onNextServer();
          }
          break;
        case 'q':
        case 'Q':
        case 'ColorF1Green':
          if (handlers.onToggleQuality) {
            e.preventDefault();
            handlers.onToggleQuality();
          }
          break;
        case 'v':
        case 'V':
        case 'ColorF2Yellow':
          if (handlers.onVoiceSearch) {
            e.preventDefault();
            handlers.onVoiceSearch();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
}

/**
 * 2D Button-to-Button Spatial Focus Navigation System for Smart TVs & Airtel Xstream Remotes
 * Handles Up, Down, Left, Right, OK/Enter, and Menu keys across all buttons and cards,
 * and prevents embedded iframes from stealing remote focus.
 */
export function useTvSpatialNavigation(enabled = true) {
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const getNavigableElements = useCallback((): HTMLElement[] => {
    if (typeof document === 'undefined') return [];

    // If an open modal dialog exists, restrict D-pad navigation inside that modal
    const openModal = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
    const container: ParentNode = openModal || document;

    const selectors = [
      '[data-tv-card="true"]',
      '[data-tv-nav="true"]',
      'button.tv-focus',
      'div.tv-focus[tabindex="0"]',
      'a.tv-focus',
      'input.tv-focus',
    ].join(', ');

    const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors));

    return nodes.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }, []);

  const focusElementSmoothly = useCallback((target: HTMLElement, direction?: string) => {
    target.focus({ preventScroll: true });
    lastActiveElementRef.current = target;

    const scrollContainer = target.closest('.overflow-x-auto, .overflow-y-auto');
    if (scrollContainer && (direction === 'left' || direction === 'right')) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    } else {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }
  }, []);

  const focusPrimaryElement = useCallback(() => {
    const candidates = getNavigableElements();
    if (candidates.length === 0) return;

    const preferred =
      candidates.find((c) => c.getAttribute('data-tv-autofocus') === 'true') ||
      candidates.find((c) => c.getAttribute('data-tv-card') === 'true') ||
      candidates[0];

    if (preferred) {
      focusElementSmoothly(preferred);
    }
  }, [getNavigableElements, focusElementSmoothly]);

  const navigateDirection = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const candidates = getNavigableElements();
      if (candidates.length === 0) return;

      const active = document.activeElement as HTMLElement | null;

      // If nothing is focused yet or focus fell outside navigable buttons, focus the best starting button
      if (!active || !candidates.includes(active)) {
        if (lastActiveElementRef.current && candidates.includes(lastActiveElementRef.current)) {
          focusElementSmoothly(lastActiveElementRef.current, direction);
          return;
        }
        focusPrimaryElement();
        return;
      }

      const curRect = active.getBoundingClientRect();
      const curCenterX = curRect.left + curRect.width / 2;
      const curCenterY = curRect.top + curRect.height / 2;

      if (direction === 'left' || direction === 'right') {
        // Horizontal navigation: prioritize buttons in the same visual row first
        const rowTolerance = Math.max(curRect.height * 0.9, 44);
        const sameRowCandidates = candidates.filter((cand) => {
          if (cand === active) return false;
          const r = cand.getBoundingClientRect();
          const cy = r.top + r.height / 2;
          const isSameRow = Math.abs(cy - curCenterY) <= rowTolerance;
          if (!isSameRow) return false;
          return direction === 'right' ? r.left > curRect.left + 4 : r.right < curRect.right - 4;
        });

        if (sameRowCandidates.length > 0) {
          sameRowCandidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const distA =
              direction === 'right'
                ? Math.abs(ra.left - curRect.right)
                : Math.abs(curRect.left - ra.right);
            const distB =
              direction === 'right'
                ? Math.abs(rb.left - curRect.right)
                : Math.abs(curRect.left - rb.right);
            return distA - distB;
          });
          focusElementSmoothly(sameRowCandidates[0], direction);
          return;
        }
      }

      // General 2D row-aware navigation (Up / Down and cross-region Left / Right)
      let bestCandidate: HTMLElement | null = null;
      let minScore = Infinity;

      for (const cand of candidates) {
        if (cand === active) continue;

        const candRect = cand.getBoundingClientRect();
        const candCenterX = candRect.left + candRect.width / 2;
        const candCenterY = candRect.top + candRect.height / 2;

        let isValidDirection = false;
        let score = Infinity;

        switch (direction) {
          case 'right': {
            if (candCenterX > curCenterX + 8) {
              isValidDirection = true;
              const dx = Math.max(0, candRect.left - curRect.right);
              const dy = Math.abs(candCenterY - curCenterY);
              score = dx + dy * 3.2;
            }
            break;
          }
          case 'left': {
            if (candCenterX < curCenterX - 8) {
              isValidDirection = true;
              const dx = Math.max(0, curRect.left - candRect.right);
              const dy = Math.abs(candCenterY - curCenterY);
              score = dx + dy * 3.2;
            }
            break;
          }
          case 'down': {
            if (candCenterY > curCenterY + 12) {
              isValidDirection = true;
              const dy = Math.max(0, candRect.top - curRect.bottom);
              const dx = Math.abs(candCenterX - curCenterX);
              // Prioritize the immediately next row below, then closest X alignment
              score = dy * 2.5 + dx * 0.85;
            }
            break;
          }
          case 'up': {
            if (candCenterY < curCenterY - 12) {
              isValidDirection = true;
              const dy = Math.max(0, curRect.top - candRect.bottom);
              const dx = Math.abs(candCenterX - curCenterX);
              score = dy * 2.5 + dx * 0.85;
            }
            break;
          }
        }

        if (isValidDirection && score < minScore) {
          minScore = score;
          bestCandidate = cand;
        }
      }

      if (bestCandidate) {
        focusElementSmoothly(bestCandidate, direction);
      }
    },
    [getNavigableElements, focusElementSmoothly, focusPrimaryElement]
  );

  // Prevent any embedded iframe from stealing remote focus away from the application UI
  useEffect(() => {
    if (!enabled) return;

    const reclaimFocusFromIframe = () => {
      const active = document.activeElement;
      if (active && active.tagName === 'IFRAME') {
        (active as HTMLElement).blur();
        const fallback = lastActiveElementRef.current;
        if (fallback && document.body.contains(fallback)) {
          fallback.focus({ preventScroll: true });
        } else {
          focusPrimaryElement();
        }
      }
    };

    window.addEventListener('blur', reclaimFocusFromIframe);
    const interval = setInterval(reclaimFocusFromIframe, 600);
    return () => {
      window.removeEventListener('blur', reclaimFocusFromIframe);
      clearInterval(interval);
    };
  }, [enabled, focusPrimaryElement]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        (target as HTMLInputElement).type !== 'range';

      const keyCode = e.keyCode || e.which;

      if (isTextInput) {
        if (e.key === 'ArrowDown' || keyCode === 40) {
          e.preventDefault();
          target.blur();
          navigateDirection('down');
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'Up' || keyCode === 38 || keyCode === 19) {
        e.preventDefault();
        navigateDirection('up');
      } else if (e.key === 'ArrowDown' || e.key === 'Down' || keyCode === 40 || keyCode === 20) {
        e.preventDefault();
        navigateDirection('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'Left' || keyCode === 37 || keyCode === 21) {
        // Allow range slider to use Left/Right only if it has explicit data-tv-slider
        if (
          target &&
          target.tagName === 'INPUT' &&
          (target as HTMLInputElement).type === 'range'
        ) {
          return;
        }
        e.preventDefault();
        navigateDirection('left');
      } else if (e.key === 'ArrowRight' || e.key === 'Right' || keyCode === 39 || keyCode === 22) {
        if (
          target &&
          target.tagName === 'INPUT' &&
          (target as HTMLInputElement).type === 'range'
        ) {
          return;
        }
        e.preventDefault();
        navigateDirection('right');
      } else if (
        e.key === 'Enter' ||
        e.key === 'NumpadEnter' ||
        e.key === 'Select' ||
        e.key === 'Accept' ||
        keyCode === 13 ||
        keyCode === 23 ||
        keyCode === 66
      ) {
        const active = document.activeElement as HTMLElement | null;
        if (!active || active === document.body) {
          e.preventDefault();
          focusPrimaryElement();
          return;
        }
        if (
          active.getAttribute('data-tv-card') === 'true' ||
          active.getAttribute('role') === 'button' ||
          active.tagName === 'BUTTON' ||
          active.tagName === 'A'
        ) {
          e.preventDefault();
          active.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, navigateDirection, focusPrimaryElement]);

  return { navigateDirection, getNavigableElements, focusPrimaryElement };
}
