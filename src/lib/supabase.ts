import { createClient } from '@supabase/supabase-js';
import type { DMMessage } from '../types/dm';

interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing',
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey?.length
});

if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          avatar_url: string | null;
          banner_url: string | null;
          avatar_color: string;
          bio: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          avatar_url?: string | null;
          banner_url?: string | null;
          avatar_color?: string;
          bio?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          avatar_url?: string | null;
          banner_url?: string | null;
          avatar_color?: string;
          bio?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          content: string;
          user_name: string;
          user_id: string;
          avatar_color: string;
          created_at: string | null;
          avatar_url: string | null;
          hearts_count: number | null;
        };
        Insert: {
          id?: string;
          content: string;
          user_name: string;
          user_id: string;
          avatar_color?: string;
          created_at?: string | null;
          avatar_url?: string | null;
          hearts_count?: number | null;
        };
        Update: {
          id?: string;
          content?: string;
          user_name?: string;
          user_id?: string;
          avatar_color?: string;
          created_at?: string | null;
          avatar_url?: string | null;
          hearts_count?: number | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          subscription: PushSubscriptionData;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          subscription: PushSubscriptionData;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          subscription?: PushSubscriptionData;
          created_at?: string | null;
        };
      };
      dms: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          messages: DMMessage[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          user1_username: string;
          user2_username: string;
          messages?: DMMessage[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          user1_username?: string;
          user2_username?: string;
          messages?: DMMessage[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}