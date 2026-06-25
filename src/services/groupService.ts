import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Group = Database["public"]["Tables"]["groups"]["Row"];
type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];

export const groupService = {
  async createGroup(group: GroupInsert) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("groups")
      .insert({ ...group, created_by: user.id })
      .select()
      .single();

    if (!error && data) {
      // Auto-join creator as admin
      await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user.id,
        role: "admin",
      });
    }

    return { data, error };
  },

  async getAllGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        creator:profiles!groups_created_by_fkey(id, full_name, avatar_url),
        group_members(id)
      `)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  async getGroupById(id: string) {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        *,
        creator:profiles!groups_created_by_fkey(id, full_name, avatar_url),
        group_members(
          id,
          role,
          joined_at,
          member:profiles!group_members_user_id_fkey(id, full_name, avatar_url, profession)
        )
      `)
      .eq("id", id)
      .single();

    return { data, error };
  },

  async joinGroup(groupId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      })
      .select()
      .single();

    return { data, error };
  },

  async leaveGroup(groupId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    return { error };
  },

  async getGroupPosts(groupId: string) {
    const { data, error } = await supabase
      .from("group_posts")
      .select(`
        *,
        author:profiles!group_posts_user_id_fkey(id, full_name, avatar_url, profession),
        group_post_likes(id, user_id)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  async createGroupPost(groupId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("group_posts")
      .insert({
        group_id: groupId,
        user_id: user.id,
        content,
      })
      .select()
      .single();

    return { data, error };
  },

  async likeGroupPost(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("group_post_likes")
      .insert({
        post_id: postId,
        user_id: user.id,
      })
      .select()
      .single();

    return { data, error };
  },

  async unlikeGroupPost(postId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("group_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    return { error };
  },
};