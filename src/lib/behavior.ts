export const BEHAVIOR_AREAS = [
  "app_navigation",
  "dashboard_discover",
  "dashboard_search",
  "dashboard_mix",
  "library",
  "playlists",
  "browse_generations",
  "browse_emotions",
  "collection_builder",
  "playlist_detail",
  "saved_collection",
  "player_controls",
  "recommendation_settings",
] as const;

export type BehaviorArea = (typeof BEHAVIOR_AREAS)[number];

export const BEHAVIOR_EVENTS = [
  "area_view",
  "item_view",
  "pointer_pause",
  "click",
  "filter_select",
  "play",
  "pause",
  "skip",
  "complete",
  "save",
] as const;

export type BehaviorEventType = (typeof BEHAVIOR_EVENTS)[number];
export type BehaviorItemType =
  | "song"
  | "generation"
  | "emotion"
  | "mood"
  | "playlist";

export interface BehaviorEvent {
  eventType: BehaviorEventType;
  areaKey: BehaviorArea;
  itemType?: BehaviorItemType;
  itemId?: string;
  durationMs?: number;
  isClick?: boolean;
}

export interface StoredBehaviorEvent {
  area_key: BehaviorArea;
  event_type: BehaviorEventType;
  item_type: BehaviorItemType | null;
  item_id: string | null;
  duration_ms: number | null;
  created_at: string;
}

export function isMissingBehaviorTable(
  error: { code?: string; message?: string; details?: string } | null | undefined,
  table: string,
) {
  if (!error || !["PGRST205", "42P01"].includes(error.code ?? "")) return false;
  const description = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return description.includes(table.toLowerCase());
}
