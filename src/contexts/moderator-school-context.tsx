import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchools } from "@/hooks/useModerators";

const STORAGE_KEY = "moderator_active_school_id";

type ModeratorSchoolContextType = {
  activeSchoolId: number | null;
  setActiveSchoolId: (id: number | null) => void;
  moderatorSchoolIds: number[];
  isLoadingSchools: boolean;
};

const ModeratorSchoolContext = createContext<ModeratorSchoolContextType | undefined>(
  undefined
);

export function ModeratorSchoolProvider({ children }: { children: ReactNode }) {
  const { isModerator, moderatorId } = useAuth();
  const { data: schools = [], isLoading } = useModeratorSchools(
    isModerator ? moderatorId : null
  );
  const [activeSchoolId, setActiveSchoolIdState] = useState<number | null>(() => {
    if (!isModerator) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  });

  const moderatorSchoolIds = useMemo(
    () => schools.map((s: { school_id: number }) => s.school_id),
    [schools]
  );

  useEffect(() => {
    if (!isModerator) {
      setActiveSchoolIdState(null);
      return;
    }
    if (isLoading) return;

    if (moderatorSchoolIds.length === 0) {
      setActiveSchoolIdState(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (activeSchoolId != null && moderatorSchoolIds.includes(activeSchoolId)) {
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const storedId = stored ? parseInt(stored, 10) : NaN;
    if (Number.isFinite(storedId) && moderatorSchoolIds.includes(storedId)) {
      setActiveSchoolIdState(storedId);
      return;
    }

    const first = moderatorSchoolIds[0];
    setActiveSchoolIdState(first);
    localStorage.setItem(STORAGE_KEY, String(first));
  }, [isModerator, isLoading, moderatorSchoolIds, activeSchoolId]);

  const setActiveSchoolId = useCallback(
    (id: number | null) => {
      if (id != null && !moderatorSchoolIds.includes(id)) return;
      setActiveSchoolIdState(id);
      if (id == null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(id));
    },
    [moderatorSchoolIds]
  );

  const value = useMemo(
    () => ({
      activeSchoolId: isModerator ? activeSchoolId : null,
      setActiveSchoolId,
      moderatorSchoolIds,
      isLoadingSchools: isLoading,
    }),
    [isModerator, activeSchoolId, setActiveSchoolId, moderatorSchoolIds, isLoading]
  );

  return (
    <ModeratorSchoolContext.Provider value={value}>
      {children}
    </ModeratorSchoolContext.Provider>
  );
}

export function useModeratorSchoolContext() {
  const ctx = useContext(ModeratorSchoolContext);
  if (!ctx) {
    throw new Error("useModeratorSchoolContext must be used within ModeratorSchoolProvider");
  }
  return ctx;
}

export function useModeratorSchoolContextOptional() {
  return useContext(ModeratorSchoolContext);
}
