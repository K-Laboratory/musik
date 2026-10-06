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
          definition: string | null;
          sounds_like: string | null;
          valence: number;
          arousal: number;
          quadrant: string;
        };
        Insert: {
          id: string;
          name: string;
          definition?: string | null;
          sounds_like?: string | null;
          valence: number;
          arousal: number;
          quadrant: string;
        };
        Update: {
          id?: string;
          name?: string;
          definition?: string | null;
          sounds_like?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
