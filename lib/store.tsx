'use client';

import type { User } from '@supabase/supabase-js';
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
import * as repo from './repo';
import { supabaseBrowser } from './supabase/client';
import {
  EMPTY_STATE,
  type Company,
  type Deal,
  type Exercise,
  type FixedCost,
  type Holding,
  type HubState,
  type Receipt,
  type Workout,
} from './types';

interface StoreValue {
  state: HubState;
  /** False tills första hämtningen är klar. Vyer visar skelett så länge. */
  ready: boolean;
  /** Senaste skrivfel, på svenska. Null när allt gått bra. */
  error: string | null;
  clearError: () => void;
  user: User | null;
  signOut: () => Promise<void>;

  /**
   * Bolaget dashboarden visar just nu. Null tills bolagen hämtats. Valet
   * ligger i localStorage — det är ett vyval, inte data, och ska överleva
   * en omladdning utan att kosta en databasrad.
   */
  activeCompany: Company | null;
  setActiveCompany: (id: string) => void;
  saveCompany: (company: Company) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;

  addReceipt: (receipt: Omit<Receipt, 'id' | 'createdAt'>) => Promise<void>;
  removeReceipt: (receipt: Receipt) => Promise<void>;
  saveHolding: (holding: Holding) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'id'>) => Promise<Exercise | null>;
  addWorkout: (workout: Omit<Workout, 'id' | 'createdAt'>) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
  saveDeal: (deal: Deal) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;
  saveFixedCost: (cost: FixedCost) => Promise<void>;
  removeFixedCost: (id: string) => Promise<void>;
  uploadImage: (blob: Blob) => Promise<string | undefined>;
  imageUrl: (path: string) => Promise<string | null>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HubState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  // Klienten skapas en gång. Skapas den om vid varje render tappas
  // sessionslyssnaren och realtidskopplingarna.
  const dbRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);
  if (dbRef.current === null && typeof window !== 'undefined') {
    dbRef.current = supabaseBrowser();
  }

  const refresh = useCallback(async (userId: string) => {
    const db = dbRef.current;
    if (!db) return;
    try {
      setState(await repo.loadAll(db, userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta data.');
    }
  }, []);

  useEffect(() => {
    const db = dbRef.current;
    if (!db) return;

    let cancelled = false;

    db.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      if (data.user) await refresh(data.user.id);
      setReady(true);
    });

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setState(EMPTY_STATE);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (state.companies.length === 0) return;
    const sparat = safeGet(AKTIVT_BOLAG);
    const giltigt = activeCompanyId && state.companies.some((c) => c.id === activeCompanyId);
    if (giltigt) return;
    const kandidat = state.companies.find((c) => c.id === sparat) ?? state.companies[0];
    setActiveCompanyId(kandidat.id);
  }, [state.companies, activeCompanyId]);

  const activeCompany = useMemo(
    () => state.companies.find((c) => c.id === activeCompanyId) ?? null,
    [state.companies, activeCompanyId],
  );

  /**
   * Kör en skrivning och hämtar om allt efteråt.
   *
   * Datamängderna är små — en persons kvitton och pass — så en omhämtning
   * kostar ingenting och garanterar att det som visas är det som faktiskt
   * ligger i databasen. Optimistiska uppdateringar hade gett en snabbare
   * känsla och en hel klass av buggar på köpet.
   */
  const write = useCallback(
    async <T,>(fn: (db: repo.Db, userId: string) => Promise<T>): Promise<T | undefined> => {
      const db = dbRef.current;
      if (!db || !user) {
        setError('Du är inte inloggad.');
        return undefined;
      }
      setError(null);
      try {
        const result = await fn(db, user.id);
        await refresh(user.id);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Något gick fel vid sparandet.');
        return undefined;
      }
    },
    [user, refresh],
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      ready,
      error,
      user,
      clearError: () => setError(null),

      signOut: async () => {
        await dbRef.current?.auth.signOut();
        setState(EMPTY_STATE);
        setUser(null);
        window.location.href = '/login';
      },

      addReceipt: async (receipt) => {
        await write((db, uid) => repo.insertReceipt(db, uid, receipt));
      },

      removeReceipt: async (receipt) => {
        await write(async (db) => {
          if (receipt.imageKey) await repo.deleteReceiptImage(db, receipt.imageKey);
          await repo.deleteReceipt(db, receipt.id);
        });
      },

      saveHolding: async (holding) => {
        await write((db, uid) => repo.upsertHolding(db, uid, holding));
      },

      removeHolding: async (id) => {
        await write((db) => repo.deleteHolding(db, id));
      },

      addExercise: async (exercise) => {
        const created = await write((db, uid) => repo.insertExercise(db, uid, exercise));
        return created ?? null;
      },

      addWorkout: async (workout) => {
        await write((db, uid) => repo.insertWorkout(db, uid, workout));
      },

      removeWorkout: async (id) => {
        await write((db) => repo.deleteWorkout(db, id));
      },

      activeCompany,
      setActiveCompany: (id) => {
        setActiveCompanyId(id);
        safeSet(AKTIVT_BOLAG, id);
      },

      saveCompany: async (company) => {
        await write((db, uid) => repo.upsertCompany(db, uid, company));
      },

      removeCompany: async (id) => {
        await write((db) => repo.deleteCompany(db, id));
      },

      saveDeal: async (deal) => {
        // En affär utan bolag hör till det aktiva. Saknas även det finns
        // ingenting att spara mot — hellre ett tydligt fel än en rad som
        // databasen ändå avvisar.
        const companyId = deal.companyId || activeCompanyId;
        if (!companyId) {
          setError('Inget bolag valt.');
          return;
        }
        await write((db, uid) => repo.upsertDeal(db, uid, { ...deal, companyId }));
      },

      removeDeal: async (id) => {
        await write((db) => repo.deleteDeal(db, id));
      },

      saveFixedCost: async (cost) => {
        const companyId = cost.companyId || activeCompanyId;
        if (!companyId) {
          setError('Inget bolag valt.');
          return;
        }
        await write((db, uid) => repo.upsertFixedCost(db, uid, { ...cost, companyId }));
      },

      removeFixedCost: async (id) => {
        await write((db) => repo.deleteFixedCost(db, id));
      },

      // Bilduppladdning hämtar inte om — kvittot är inte sparat ännu.
      uploadImage: async (blob) => {
        const db = dbRef.current;
        if (!db || !user) return undefined;
        try {
          return await repo.uploadReceiptImage(db, user.id, blob);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Kunde inte ladda upp bilden.');
          return undefined;
        }
      },

      imageUrl: async (path) => {
        const db = dbRef.current;
        if (!db) return null;
        return repo.receiptImageUrl(db, path);
      },
    }),
    [state, ready, error, user, write, activeCompany, activeCompanyId],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

const AKTIVT_BOLAG = 'jarvis.aktivtBolag';

// localStorage kan kasta i privat läge och saknas vid SSR. Ett vyval är inte
// värt en krasch.
function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignoreras */
  }
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore måste ligga inuti <StoreProvider>');
  return ctx;
}
