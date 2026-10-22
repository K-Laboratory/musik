"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BEHAVIOR_AREAS,
  BEHAVIOR_EVENTS,
  type BehaviorArea,
  type BehaviorEvent,
  type BehaviorEventType,
  type BehaviorItemType,
} from "@/lib/behavior";

interface AreaSummary {
  areaKey: BehaviorArea;
  views: number;
  clicks: number;
  dwellMs: number;
  pointerPauses: number;
}

interface PersonalizationSummary {
  events: number;
  plays: number;
  areas: AreaSummary[];
}

interface PersonalizationContextValue {
  enabled: boolean;
  available: boolean;
  collectionEnabled: boolean;
  retentionDays: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
  summary: PersonalizationSummary;
  setEnabled: (enabled: boolean) => Promise<void>;
  clearHistory: () => Promise<void>;
  track: (event: BehaviorEvent) => void;
  refresh: () => Promise<void>;
}

const emptySummary: PersonalizationSummary = { events: 0, plays: 0, areas: [] };
const PersonalizationContext = createContext<PersonalizationContextValue | null>(null);

function isArea(value: string | null | undefined): value is BehaviorArea {
  return Boolean(value && BEHAVIOR_AREAS.includes(value as BehaviorArea));
}

function sessionId() {
  const key = "favorite-songs:behavior-session";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(true);
  const [collectionEnabled, setCollectionEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState(emptySummary);
  const enabledRef = useRef(false);
  const collectionEnabledRef = useRef(false);
  const queueRef = useRef<Array<BehaviorEvent & { sessionId: string }>>([]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const refresh = useCallback(async () => {
    if (!enabledRef.current) setLoading(true);
    try {
      const response = await fetch("/api/personalization", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load personalization settings.");
      const payload = await response.json() as {
        enabled?: boolean;
        available?: boolean;
        collectionEnabled?: boolean;
        retentionDays?: number;
        summary?: PersonalizationSummary;
      };
      const isEnabled = payload.enabled === true;
      const isCollectionEnabled = payload.collectionEnabled === true;
      setAvailable(payload.available !== false);
      setCollectionEnabled(isCollectionEnabled);
      collectionEnabledRef.current = isCollectionEnabled;
      setRetentionDays([30, 60, 90].includes(payload.retentionDays ?? 90) ? payload.retentionDays! : 90);
      enabledRef.current = isEnabled;
      setEnabledState(isEnabled);
      setSummary(payload.summary ?? emptySummary);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load personalization settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const track = useCallback((event: BehaviorEvent) => {
    if (!enabledRef.current || !collectionEnabledRef.current || typeof window === "undefined") return;
    queueRef.current.push({ ...event, sessionId: sessionId() });
    if (queueRef.current.length >= 20) {
      window.dispatchEvent(new Event("favorite-songs:flush-behavior"));
    }
  }, []);

  const flush = useCallback(async (keepalive = false) => {
    if (!enabledRef.current || !collectionEnabledRef.current || queueRef.current.length === 0) return;
    const events = queueRef.current.splice(0, 30);
    try {
      const response = await fetch("/api/behavior", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events }),
        keepalive,
      });
      if (!response.ok) throw new Error("Event save failed.");
      if (!keepalive) void refresh();
    } catch {
      if (enabledRef.current) queueRef.current = [...events, ...queueRef.current].slice(-60);
    }
  }, [refresh]);

  useEffect(() => {
    if (!collectionEnabled) queueRef.current = [];
  }, [collectionEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => void flush(), 8000);
    const flushHandler = () => void flush();
    const unloadHandler = () => void flush(true);
    window.addEventListener("favorite-songs:flush-behavior", flushHandler);
    window.addEventListener("pagehide", unloadHandler);
    document.addEventListener("visibilitychange", unloadHandler);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("favorite-songs:flush-behavior", flushHandler);
      window.removeEventListener("pagehide", unloadHandler);
      document.removeEventListener("visibilitychange", unloadHandler);
    };
  }, [flush]);

  useEffect(() => {
    if (!enabled || !collectionEnabled) return;
    const starts = new Map<Element, number>();
    const tracked = new Set<Element>();
    let pointerPauseTimer: number | null = null;
    let pointerPauseEvent: BehaviorEvent | null = null;
    const observer: IntersectionObserver = new IntersectionObserver((entries) => {
      const now = Date.now();
      for (const entry of entries) {
        if (entry.isIntersecting && document.visibilityState === "visible") {
          if (!starts.has(entry.target)) starts.set(entry.target, now);
        } else {
          finish(entry.target, now);
        }
      }
    }, { threshold: 0.4 });

    function finish(element: Element, now = Date.now()) {
      const started = starts.get(element);
      starts.delete(element);
      const areaElement = element.hasAttribute("data-behavior-area")
        ? element
        : element.closest("[data-behavior-area]");
      const area = areaElement?.getAttribute("data-behavior-area");
      const durationMs = started === undefined ? 0 : Math.min(now - started, 300_000);
      if (isArea(area) && element.hasAttribute("data-behavior-area") && durationMs >= 2500) {
        track({ eventType: "area_view", areaKey: area, durationMs });
      } else if (
        area === "dashboard_mix" &&
        element.getAttribute("data-behavior-item-type") === "song" &&
        durationMs >= 1000
      ) {
        const itemId = element.getAttribute("data-behavior-item-id");
        if (itemId) track({ eventType: "item_view", areaKey: "dashboard_mix", itemType: "song", itemId, durationMs });
      }
    }

    function observeAreas() {
      for (const element of starts.keys()) {
        if (!element.isConnected) finish(element);
      }
      document.querySelectorAll(
        '[data-behavior-area], [data-behavior-area="dashboard_mix"] [data-behavior-item-type="song"][data-behavior-item-id]',
      ).forEach((element) => {
        if (tracked.has(element)) return;
        tracked.add(element);
        observer.observe(element);
      });
    }

    const mutationObserver = new MutationObserver(observeAreas);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    observeAreas();

    function visibilityChanged() {
      if (document.visibilityState === "hidden") {
        clearPointerPause();
        const now = Date.now();
        for (const element of starts.keys()) finish(element, now);
      } else {
        tracked.forEach((element) => {
          if (element.isConnected) {
            observer.unobserve(element);
            observer.observe(element);
          }
        });
      }
    }

    function clearPointerPause() {
      if (pointerPauseTimer !== null) window.clearTimeout(pointerPauseTimer);
      pointerPauseTimer = null;
      pointerPauseEvent = null;
    }

    function pointerMoved(event: PointerEvent) {
      clearPointerPause();
      if (event.pointerType !== "mouse" || event.buttons !== 0 || document.visibilityState !== "visible") return;
      const target = event.target instanceof Element ? event.target : null;
      const area = target?.closest<HTMLElement>("[data-behavior-area]")?.dataset.behaviorArea;
      if (!isArea(area)) return;

      const item = target?.closest<HTMLElement>("[data-behavior-item-type][data-behavior-item-id]");
      const rawType = item?.dataset.behaviorItemType;
      const itemType = ["song", "generation", "emotion", "mood", "playlist"].includes(rawType ?? "")
        ? rawType as BehaviorItemType
        : undefined;
      pointerPauseEvent = {
        eventType: "pointer_pause",
        areaKey: area,
        itemType,
        itemId: item?.dataset.behaviorItemId?.slice(0, 100),
      };
      // Keep only the section/item and elapsed pause; pointer coordinates are never read.
      pointerPauseTimer = window.setTimeout(() => {
        if (document.visibilityState === "visible" && pointerPauseEvent) {
          track({ ...pointerPauseEvent, durationMs: 2500 });
        }
        pointerPauseTimer = null;
        pointerPauseEvent = null;
      }, 2500);
    }

    function clicked(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const action = target.closest<HTMLElement>("[data-behavior-action]");
      const areaElement = action?.closest<HTMLElement>("[data-behavior-area]")
        ?? target.closest<HTMLElement>("[data-behavior-area]");
      const area = areaElement?.dataset.behaviorArea;
      if (!isArea(area)) return;

      const rawAction = action?.dataset.behaviorAction;
      const eventType: BehaviorEventType = BEHAVIOR_EVENTS.includes(rawAction as BehaviorEventType)
        && rawAction !== "area_view" && rawAction !== "pointer_pause"
        ? rawAction as BehaviorEventType
        : "click";
      const rawType = action?.dataset.behaviorItemType;
      const itemType = ["song", "generation", "emotion", "mood", "playlist"].includes(rawType ?? "")
        ? rawType as BehaviorItemType
        : undefined;
      track({
        eventType,
        areaKey: area,
        itemType,
        itemId: action?.dataset.behaviorItemId?.slice(0, 100),
        isClick: true,
      });
    }

    document.addEventListener("click", clicked, true);
    document.addEventListener("visibilitychange", visibilityChanged);
    document.addEventListener("pointermove", pointerMoved, { capture: true, passive: true });
    document.addEventListener("scroll", clearPointerPause, true);
    window.addEventListener("blur", clearPointerPause);
    return () => {
      document.removeEventListener("click", clicked, true);
      document.removeEventListener("visibilitychange", visibilityChanged);
      document.removeEventListener("pointermove", pointerMoved, true);
      document.removeEventListener("scroll", clearPointerPause, true);
      window.removeEventListener("blur", clearPointerPause);
      clearPointerPause();
      mutationObserver.disconnect();
      observer.disconnect();
      for (const element of starts.keys()) finish(element);
    };
  }, [enabled, collectionEnabled, track]);

  const setEnabled = useCallback(async (next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/personalization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "Could not update personalization settings.");
      }
      setAvailable(true);
      enabledRef.current = next;
      setEnabledState(next);
      if (!next) queueRef.current = [];
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update personalization settings.");
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  const clearHistory = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/behavior", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not clear listening history.");
      queueRef.current = [];
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not clear listening history.");
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  return (
    <PersonalizationContext.Provider value={{ enabled, available, collectionEnabled, retentionDays, loading, saving, error, summary, setEnabled, clearHistory, track, refresh }}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);
  if (!context) throw new Error("usePersonalization must be used inside PersonalizationProvider.");
  return context;
}
