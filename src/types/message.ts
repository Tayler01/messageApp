export interface Message {
  id: string;
  content: string;
  user_name: string;
  user_id: string;
  created_at: string;
  avatar_color: string;
  avatar_url?: string | null;
  hearts_count?: number;
}

export interface User {
  id: string;
  name: string;
  avatar_color: string;
}