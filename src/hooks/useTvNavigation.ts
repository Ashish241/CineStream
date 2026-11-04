import { useEffect, useState, useCallback, useRef } from 'react';

export function isSmartTvUserAgent(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const search = window.location.search;
  if (search.includes('tv=1') || search.includes('mode=tv')) return true;
  return /SmartTV|Tizen|Web0S|webOS|AppleTV|Android.*TV|GoogleTV|HbbTV|CrKey|Viera|BRAVIA|Silk|AmazonWebAppPlatform|Airtel|Xstream|AFTB|AFTM|AFTT|MiBox|SHIELD|TV Bro/i.test(
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
  onFullscreen?: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onNextServer?: () => void;
  onToggleQuality?: () => void;
  onVoiceSearch?: () => void;
}

export function useTvHotkeys(handlers: TvKeyHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isInput) {
        if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
          target.blur();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
        case 'BrowserBack':
        case ' XF86Back':
          if (handlers.onBack) {
            e.preventDefault();
            handlers.onBack();
          }
          break;
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
        case 'AudioVolumeMute':
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
 * 2D Spatial Grid Focus Navigation System for Smart TVs / D-pad Remotes
 * Handles ArrowUp, ArrowDown, ArrowLeft, ArrowRight, and Enter keys.
 * Calculates geometric vector distances across visible interactive cards and buttons.
 */
export function useTvSpatialNavigation(enabled = true) {
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const getNavigableElements = useCallback((): HTMLElement[] => {
    if (typeof document === 'undefined') return [];

    // If an open modal exists, restrict navigation within that modal dialog
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
      // Must be visible and interactive
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

  const navigateDirection = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      const candidates = getNavigableElements();
      if (candidates.length === 0) return;

      const active = document.activeElement as HTMLElement | null;

      // If nothing is focused yet, or activeElement is outside navigable pool, focus closest or first
      if (!active || !candidates.includes(active)) {
        // Find first card or first navigable element
        const firstCard = candidates.find((c) => c.getAttribute('data-tv-card') === 'true');
        const target = firstCard || candidates[0];
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }

      const curRect = active.getBoundingClientRect();
      const curCenterX = curRect.left + curRect.width / 2;
      const curCenterY = curRect.top + curRect.height / 2;

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
            // Must be strictly to the right
            if (candRect.left > curRect.left + 8) {
              isValidDirection = true;
              const dx = candRect.left - curRect.right;
              const primaryDist = dx >= 0 ? dx : Math.abs(candRect.left - curRect.left);
              const crossDist = Math.abs(candCenterY - curCenterY);
              // Penalize vertical divergence strongly so horizontal row navigation stays in the same row
              score = primaryDist + crossDist * 3.0;
            }
            break;
          }
          case 'left': {
            // Must be strictly to the left
            if (candRect.right < curRect.right - 8) {
              isValidDirection = true;
              const dx = curRect.left - candRect.right;
              const primaryDist = dx >= 0 ? dx : Math.abs(curRect.right - candRect.right);
              const crossDist = Math.abs(candCenterY - curCenterY);
              score = primaryDist + crossDist * 3.0;
            }
            break;
          }
          case 'down': {
            // Must be strictly below
            if (candRect.top > curRect.top + 10) {
              isValidDirection = true;
              const dy = candRect.top - curRect.bottom;
              const primaryDist = dy >= 0 ? dy : Math.abs(candRect.top - curRect.top);
              const crossDist = Math.abs(candCenterX - curCenterX);
              // Heavily reward columns that line up with the current element's X center
              score = primaryDist + crossDist * 1.8;
            }
            break;
          }
          case 'up': {
            // Must be strictly above
            if (candRect.bottom < curRect.bottom - 10) {
              isValidDirection = true;
              const dy = curRect.top - candRect.bottom;
              const primaryDist = dy >= 0 ? dy : Math.abs(curRect.bottom - candRect.bottom);
              const crossDist = Math.abs(candCenterX - curCenterX);
              score = primaryDist + crossDist * 1.8;
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
        bestCandidate.focus();
        lastActiveElementRef.current = bestCandidate;

        // Smooth scroll horizontally and vertically
        // If parent has overflow-x auto, scroll inside it
        const scrollContainer = bestCandidate.closest('.overflow-x-auto');
        if (scrollContainer && (direction === 'left' || direction === 'right')) {
          bestCandidate.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        } else {
          bestCandidate.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }
      }
    },
    [getNavigableElements]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // In input fields, only ArrowDown leaves the input to go into the grid
      if (isInput) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          target.blur();
          navigateDirection('down');
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigateDirection('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDirection('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateDirection('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateDirection('right');
          break;
        case 'Enter':
        case 'NumpadEnter':
          // If active element is a card without standard button behavior, trigger click
          if (
            target &&
            (target.getAttribute('data-tv-card') === 'true' ||
              target.getAttribute('role') === 'button')
          ) {
            e.preventDefault();
            target.click();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, navigateDirection]);

  return { navigateDirection, getNavigableElements };
}
