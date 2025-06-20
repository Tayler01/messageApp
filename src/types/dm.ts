export interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface DMConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_username: string;
  user2_username: string;
  messages: DMMessage[];
  updated_at: string;
}

