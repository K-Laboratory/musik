"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ViewMode = "normal" | "compact";

const STORAGE_KEY = "favorite-songs:view-mode";

interface ViewModeContextValue {
  mode: ViewMode;
  isCompact: boolean;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function readStoredMode(): ViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "compact" || stored === "normal") return stored;
  } catch {
    // localStorage can be unavailable (private mode); fall back to normal.
  }
  return "normal";
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  // Default to "normal" so the first client render matches the server render.
  const [mode, setModeState] = useState<ViewMode>("normal");

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ViewMode = current === "normal" ? "compact" : "normal";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  const value = useMemo<ViewModeContextValue>(
    () => ({ mode, isCompact: mode === "compact", setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error("useViewMode must be used inside a <ViewModeProvider>.");
  }
  return context;
}
