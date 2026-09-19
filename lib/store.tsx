'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { deleteImage, loadState, putImage, saveState } from './db';
import { EMPTY_STATE, type HubState } from './types';

interface StoreValue {
  state: HubState;
  /** False tills IndexedDB har svarat. Vyer visar skelett så länge. */
  ready: boolean;
  /** Muterar state immutabelt och persisterar (debouncat). */
  update: (fn: (draft: HubState) => HubState) => void;
  /** Ersätter hela state — används av import/återställning. */
  replace: (next: HubState) => void;
  putImage: typeof putImage;
  deleteImage: typeof deleteImage;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadState().then((loaded) => {
      if (cancelled) return;
      setState(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: HubState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveState(next), 250);
  }, []);

  const update = useCallback(
    (fn: (draft: HubState) => HubState) => {
      setState((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replace = useCallback(
    (next: HubState) => {
      setState(next);
      persist(next);
    },
    [persist],
  );

  const value = useMemo<StoreValue>(
    () => ({ state, ready, update, replace, putImage, deleteImage }),
    [state, ready, update, replace],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore måste ligga inuti <StoreProvider>');
  return ctx;
}
