import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Message = Tables<"messages">;
export type Connection = Tables<"connections">;

export interface ConversationPreview {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export const messageService = {
  // Send a new message
  async sendMessage(receiverId: string, content: string): Promise<{ data: Message | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
        })
        .select()
        .single();

      console.log("Send message:", { data, error });
      return { data, error };
    } catch (error: any) {
      console.error("Send message error:", error);
      return { data: null, error };
    }
  },

  // Get conversation with a specific user
  async getConversation(partnerId: string): Promise<{ data: Message[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      console.log("Get conversation:", { partnerId, data, error });
      return { data: data || [], error };
    } catch (error: any) {
      console.error("Get conversation error:", error);
      return { data: [], error };
    }
  },

  // Get all conversations for current user
  async getConversations(): Promise<{ data: ConversationPreview[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url),
          receiver:profiles!messages_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: [], error };
      }

      // Group messages by conversation partner
      const conversationsMap = new Map<string, ConversationPreview>();

      messages?.forEach((msg: any) => {
        const isReceiver = msg.receiver_id === user.id;
        const partnerId = isReceiver ? msg.sender_id : msg.receiver_id;
        const partner = isReceiver ? msg.sender : msg.receiver;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            partnerId,
            partnerName: partner?.full_name || "Kullanıcı",
            partnerAvatar: partner?.avatar_url || null,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: isReceiver && !msg.read ? 1 : 0,
          });
        } else {
          const existing = conversationsMap.get(partnerId)!;
          if (isReceiver && !msg.read) {
            existing.unreadCount += 1;
          }
        }
      });

      const conversations = Array.from(conversationsMap.values());
      return { data: conversations, error: null };
    } catch (error: any) {
      console.error("Get conversations error:", error);
      return { data: [], error };
    }
  },

  // Mark messages as read
  async markAsRead(partnerId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", partnerId)
        .eq("receiver_id", user.id)
        .eq("read", false);

      console.log("Mark as read:", { partnerId, error });
      return { error };
    } catch (error: any) {
      console.error("Mark as read error:", error);
      return { error };
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages(currentUserId: string, partnerId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const message = payload.new as Message;
          if (message.sender_id === partnerId) {
            callback(message);
          }
        }
      )
      .subscribe();

    return channel;
  },

  // Connection Management

  // Send connection request
  async sendConnectionRequest(receiverId: string): Promise<{ data: Connection | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("connections")
        .insert({
          requester_id: user.id,
          receiver_id: receiverId,
          status: "pending",
        })
        .select()
        .single();

      console.log("Send connection request:", { data, error });
      return { data, error };
    } catch (error: any) {
      console.error("Send connection request error:", error);
      return { data: null, error };
    }
  },

  // Accept connection request
  async acceptConnection(connectionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", connectionId);

      console.log("Accept connection:", { connectionId, error });
      return { error };
    } catch (error: any) {
      console.error("Accept connection error:", error);
      return { error };
    }
  },

  // Reject connection request
  async rejectConnection(connectionId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "rejected" })
        .eq("id", connectionId);

      console.log("Reject connection:", { connectionId, error });
      return { error };
    } catch (error: any) {
      console.error("Reject connection error:", error);
      return { error };
    }
  },

  // Get pending connection requests
  async getPendingRequests(): Promise<{ data: any[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("connections")
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, profession)
        `)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      console.log("Get pending requests:", { data, error });
      return { data: data || [], error };
    } catch (error: any) {
      console.error("Get pending requests error:", error);
      return { data: [], error };
    }
  },

  // Get connection status with a user
  async getConnectionStatus(userId: string): Promise<{ data: Connection | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user.id})`)
        .single();

      console.log("Get connection status:", { userId, data, error });
      return { data, error };
    } catch (error: any) {
      console.error("Get connection status error:", error);
      return { data: null, error };
    }
  },

  // Get all accepted connections
  async getMyConnections(): Promise<{ data: any[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("connections")
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url, profession, city),
          receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url, profession, city)
        `)
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      // Transform data to always show the other person
      const connections = data?.map((conn: any) => {
        const isRequester = conn.requester_id === user.id;
        return {
          ...conn,
          partner: isRequester ? conn.receiver : conn.requester,
        };
      }) || [];

      console.log("Get my connections:", { data: connections, error });
      return { data: connections, error };
    } catch (error: any) {
      console.error("Get my connections error:", error);
      return { data: [], error };
    }
  },
};