/**
 * Hand-written database types that mirror `supabase/migrations/20250101000000_init.sql`.
 *
 * If you change the schema you can regenerate this file with the Supabase CLI:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      playlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          channel_title: string | null;
          thumbnail_url: string | null;
          duration: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          youtube_video_id: string;
          title: string;
          channel_title?: string | null;
          thumbnail_url?: string | null;
          duration?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          youtube_video_id?: string;
          title?: string;
          channel_title?: string | null;
          thumbnail_url?: string | null;
          duration?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      playlist_songs: {
        Row: {
          id: string;
          playlist_id: string;
          song_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          playlist_id: string;
          song_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          playlist_id?: string;
          song_id?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      // --- Emotion classification (admin) ---------------------------------
      admin_emails: {
        Row: { email: string; created_at: string };
        Insert: { email: string; created_at?: string };
        Update: { email?: string; created_at?: string };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          label_en: string;
          label_vi: string;
          birth_start: number | null;
          birth_end: number | null;
          formative_era: string | null;
          position: number;
        };
        Insert: {
          id: string;
          label_en: string;
          label_vi: string;
          birth_start?: number | null;
          birth_end?: number | null;
          formative_era?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          label_en?: string;
          label_vi?: string;
          birth_start?: number | null;
          birth_end?: number | null;
          formative_era?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      emotions: {
        Row: {
          id: string;
          name: string;
          name_vi: string | null;
          definition: string | null;
          definition_vi: string | null;
          sounds_like: string | null;
          sounds_like_vi: string | null;
          valence: number;
          arousal: number;
          quadrant: string;
        };
        Insert: {
          id: string;
          name: string;
          name_vi?: string | null;
          definition?: string | null;
          definition_vi?: string | null;
          sounds_like?: string | null;
          sounds_like_vi?: string | null;
          valence: number;
          arousal: number;
          quadrant: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_vi?: string | null;
          definition?: string | null;
          definition_vi?: string | null;
          sounds_like?: string | null;
          sounds_like_vi?: string | null;
          valence?: number;
          arousal?: number;
          quadrant?: string;
        };
        Relationships: [];
      };
      catalog_songs: {
        Row: {
          id: string;
          title: string;
          artist: string;
          year: number | null;
          generation_id: string | null;
          source: string | null;
          source_id: string | null;
          source_url: string | null;
          youtube_url: string | null;
          youtube_video_id: string | null;
          youtube_title: string | null;
          youtube_channel: string | null;
          youtube_updated_at: string | null;
          lyrics_text: string | null;
          lyrics_source: string | null;
          lyrics_source_url: string | null;
          lyrics_updated_at: string | null;
          popularity_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist: string;
          year?: number | null;
          generation_id?: string | null;
          source?: string | null;
          source_id?: string | null;
          source_url?: string | null;
          youtube_url?: string | null;
          youtube_video_id?: string | null;
          youtube_title?: string | null;
          youtube_channel?: string | null;
          youtube_updated_at?: string | null;
          lyrics_text?: string | null;
          lyrics_source?: string | null;
          lyrics_source_url?: string | null;
          lyrics_updated_at?: string | null;
          popularity_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          year?: number | null;
          generation_id?: string | null;
          source?: string | null;
          source_id?: string | null;
          source_url?: string | null;
          youtube_url?: string | null;
          youtube_video_id?: string | null;
          youtube_title?: string | null;
          youtube_channel?: string | null;
          youtube_updated_at?: string | null;
          lyrics_text?: string | null;
          lyrics_source?: string | null;
          lyrics_source_url?: string | null;
          lyrics_updated_at?: string | null;
          popularity_score?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      song_emotions: {
        Row: {
          id: string;
          song_id: string;
          emotion_id: string;
          confidence: number;
          is_primary: boolean;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          emotion_id: string;
          confidence?: number;
          is_primary?: boolean;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          song_id?: string;
          emotion_id?: string;
          confidence?: number;
          is_primary?: boolean;
          source?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      song_analysis: {
        Row: {
          id: string;
          song_id: string;
          valence: number | null;
          arousal: number | null;
          quadrant: string | null;
          model: string | null;
          taxonomy_version: number;
          rationale: string | null;
          needs_review: boolean;
          analyzed_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          valence?: number | null;
          arousal?: number | null;
          quadrant?: string | null;
          model?: string | null;
          taxonomy_version?: number;
          rationale?: string | null;
          needs_review?: boolean;
          analyzed_at?: string;
        };
        Update: {
          id?: string;
          song_id?: string;
          valence?: number | null;
          arousal?: number | null;
          quadrant?: string | null;
          model?: string | null;
          taxonomy_version?: number;
          rationale?: string | null;
          needs_review?: boolean;
          analyzed_at?: string;
        };
        Relationships: [];
      };
      song_popularity: {
        Row: {
          song_id: string;
          youtube_video_id: string | null;
          view_count: number | null;
          like_count: number | null;
          comment_count: number | null;
          channel_id: string | null;
          channel_subscribers: number | null;
          published_at: string | null;
          duration_seconds: number | null;
          views_per_day: number | null;
          engagement_rate: number | null;
          popularity_score: number;
          popularity_tier: string;
          source: string;
          calculated_at: string;
        };
        Insert: {
          song_id: string;
          youtube_video_id?: string | null;
          view_count?: number | null;
          like_count?: number | null;
          comment_count?: number | null;
          channel_id?: string | null;
          channel_subscribers?: number | null;
          published_at?: string | null;
          duration_seconds?: number | null;
          views_per_day?: number | null;
          engagement_rate?: number | null;
          popularity_score: number;
          popularity_tier: string;
          source?: string;
          calculated_at?: string;
        };
        Update: {
          song_id?: string;
          youtube_video_id?: string | null;
          view_count?: number | null;
          like_count?: number | null;
          comment_count?: number | null;
          channel_id?: string | null;
          channel_subscribers?: number | null;
          published_at?: string | null;
          duration_seconds?: number | null;
          views_per_day?: number | null;
          engagement_rate?: number | null;
          popularity_score?: number;
          popularity_tier?: string;
          source?: string;
          calculated_at?: string;
        };
        Relationships: [];
      };
      albums: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          config: Json;
          stats: Json;
          track_count: number;
          cover_video_ids: string[];
          playlist_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          config?: Json;
          stats?: Json;
          track_count?: number;
          cover_video_ids?: string[];
          playlist_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          config?: Json;
          stats?: Json;
          track_count?: number;
          cover_video_ids?: string[];
          playlist_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      album_songs: {
        Row: {
          id: string;
          album_id: string;
          song_id: string;
          position: number;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          album_id: string;
          song_id: string;
          position: number;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string;
          song_id?: string;
          position?: number;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      recommendation_preferences: {
        Row: {
          user_id: string;
          personalization_enabled: boolean;
          enabled_at: string | null;
          last_cleanup_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          personalization_enabled?: boolean;
          enabled_at?: string | null;
          last_cleanup_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          personalization_enabled?: boolean;
          enabled_at?: string | null;
          last_cleanup_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_behavior_events: {
        Row: {
          id: number;
          user_id: string;
          session_id: string;
          event_type: string;
          area_key: string;
          item_type: string | null;
          item_id: string | null;
          duration_ms: number | null;
          is_click: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          session_id: string;
          event_type: string;
          area_key: string;
          item_type?: string | null;
          item_id?: string | null;
          duration_ms?: number | null;
          is_click?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          session_id?: string;
          event_type?: string;
          area_key?: string;
          item_type?: string | null;
          item_id?: string | null;
          duration_ms?: number | null;
          is_click?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_behavior_daily: {
        Row: {
          user_id: string;
          activity_date: string;
          area_key: string;
          event_count: number;
          click_count: number;
          play_count: number;
          view_count: number;
          dwell_ms: number;
          pointer_pause_count: number;
        };
        Insert: {
          user_id: string;
          activity_date: string;
          area_key: string;
          event_count?: number;
          click_count?: number;
          play_count?: number;
          view_count?: number;
          dwell_ms?: number;
          pointer_pause_count?: number;
        };
        Update: {
          user_id?: string;
          activity_date?: string;
          area_key?: string;
          event_count?: number;
          click_count?: number;
          play_count?: number;
          view_count?: number;
          dwell_ms?: number;
          pointer_pause_count?: number;
        };
        Relationships: [];
      };
      recommendation_admin_settings: {
        Row: {
          id: boolean;
          collection_enabled: boolean;
          retention_days: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          collection_enabled?: boolean;
          retention_days?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          collection_enabled?: boolean;
          retention_days?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      recommendation_admin_settings_audit: {
        Row: {
          id: number;
          actor_user_id: string | null;
          previous_collection_enabled: boolean;
          collection_enabled: boolean;
          previous_retention_days: number;
          retention_days: number;
          changed_at: string;
        };
        Insert: {
          id?: number;
          actor_user_id?: string | null;
          previous_collection_enabled: boolean;
          collection_enabled: boolean;
          previous_retention_days: number;
          retention_days: number;
          changed_at?: string;
        };
        Update: {
          id?: number;
          actor_user_id?: string | null;
          previous_collection_enabled?: boolean;
          collection_enabled?: boolean;
          previous_retention_days?: number;
          retention_days?: number;
          changed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_recommendation_collection_policy: {
        Args: Record<string, never>;
        Returns: { collection_enabled: boolean; retention_days: number }[];
      };
      admin_behavior_analytics: {
        Args: { p_days: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
