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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
