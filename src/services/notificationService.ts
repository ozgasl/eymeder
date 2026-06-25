import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const notificationService = {
  async getMyNotifications() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return { data, error };
  },

  async getUnreadCount() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { count: 0, error: new Error("User not found") };

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.user.id)
      .eq("is_read", false);

    return { count: count || 0, error };
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .select()
      .single();

    return { data, error };
  },

  async markAllAsRead() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: new Error("User not found") };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.user.id)
      .eq("is_read", false);

    return { error };
  },

  async createNotification(userId: string, type: string, title: string, message: string, link?: string) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
      })
      .select()
      .single();

    return { data, error };
  },

  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },
};