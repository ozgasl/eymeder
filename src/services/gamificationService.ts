import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ActivityPoint = Tables<"activity_points">;
export type Badge = Tables<"badges">;

export interface BadgeDetails {
  name: string;
  description: string;
  icon: string;
  type: string;
}

export interface UserStats {
  totalPoints: number;
  earnedBadges: BadgeDetails[];
  level: number;
  rank: string;
}

// Static badge dictionary since they are not stored in a separate table
export const BADGE_DICTIONARY: Record<string, BadgeDetails> = {
  profile_complete: { name: "Profil Tamamlandı", description: "Profilini eksiksiz doldurdun", icon: "✅", type: "profile_complete" },
  first_connection: { name: "İlk Bağlantı", description: "İlk bağlantını kurdun", icon: "🤝", type: "first_connection" },
  active_member: { name: "Aktif Üye", description: "10+ bağlantı kurdun", icon: "⭐", type: "active_member" },
  network_builder: { name: "Ağ Kurucusu", description: "25+ bağlantı kurdun", icon: "🌐", type: "network_builder" },
  communicator: { name: "İletişimci", description: "50+ mesaj gönderdin", icon: "💬", type: "communicator" },
  rising_star: { name: "Yükselen Yıldız", description: "500+ puan topladın", icon: "🌟", type: "rising_star" },
};

export const gamificationService = {
  // Award points for activities
  async awardPoints(actionType: string, points: number): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { error } = await supabase
        .from("activity_points")
        .insert({
          user_id: user.id,
          action_type: actionType,
          points,
        });

      if (!error) {
        // Check for new badges after awarding points
        await this.checkAndAwardBadges(user.id);
      }

      console.log("Award points:", { actionType, points, error });
      return { error };
    } catch (error: any) {
      console.error("Award points error:", error);
      return { error };
    }
  },

  // Get user's total points
  async getUserPoints(userId?: string): Promise<{ data: number; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        return { data: 0, error: new Error("Kullanıcı bulunamadı") };
      }

      const { data, error } = await supabase
        .from("activity_points")
        .select("points")
        .eq("user_id", targetUserId);

      const totalPoints = data?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;

      console.log("Get user points:", { userId: targetUserId, totalPoints, error });
      return { data: totalPoints, error };
    } catch (error: any) {
      console.error("Get user points error:", error);
      return { data: 0, error };
    }
  },

  // Get user's earned badges
  async getUserBadges(userId?: string): Promise<{ data: BadgeDetails[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        return { data: [], error: new Error("Kullanıcı bulunamadı") };
      }

      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .eq("user_id", targetUserId)
        .order("earned_at", { ascending: false });

      // Map to full details
      const badges = data?.map((item: any) => ({
        ...(BADGE_DICTIONARY[item.badge_type] || {
          name: item.badge_name,
          description: "Rozet kazanıldı",
          icon: "🏆",
          type: item.badge_type
        }),
      })) || [];

      console.log("Get user badges:", { userId: targetUserId, badges, error });
      return { data: badges, error };
    } catch (error: any) {
      console.error("Get user badges error:", error);
      return { data: [], error };
    }
  },

  // Get all available badges
  async getAllBadges(): Promise<{ data: BadgeDetails[]; error: any }> {
    return { data: Object.values(BADGE_DICTIONARY), error: null };
  },

  // Check and award badges based on user's achievements
  async checkAndAwardBadges(userId: string): Promise<{ error: any }> {
    try {
      // Get user's stats
      const { data: points } = await this.getUserPoints(userId);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, bio, profession, city")
        .eq("id", userId)
        .single();

      if (profileError) {
        return { error: profileError };
      }

      // Get user's connections and messages
      const { data: connections } = await supabase
        .from("connections")
        .select("id")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");

      const { data: messages } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", userId);

      // Badge criteria checks
      const badgesToAward: string[] = [];

      // Profile Complete Badge
      if (profile?.full_name && profile?.bio && profile?.profession && profile?.city) {
        badgesToAward.push("profile_complete");
      }

      // First Connection Badge
      if (connections && connections.length >= 1) {
        badgesToAward.push("first_connection");
      }

      // Active Member Badge (10+ connections)
      if (connections && connections.length >= 10) {
        badgesToAward.push("active_member");
      }

      // Network Builder Badge (25+ connections)
      if (connections && connections.length >= 25) {
        badgesToAward.push("network_builder");
      }

      // Communicator Badge (50+ messages sent)
      if (messages && messages.length >= 50) {
        badgesToAward.push("communicator");
      }

      // Rising Star Badge (500+ points)
      if (points >= 500) {
        badgesToAward.push("rising_star");
      }

      // Award badges
      for (const badgeType of badgesToAward) {
        await this.awardBadge(userId, badgeType);
      }

      return { error: null };
    } catch (error: any) {
      console.error("Check and award badges error:", error);
      return { error };
    }
  },

  // Award a specific badge to user
  async awardBadge(userId: string, badgeType: string): Promise<{ error: any }> {
    try {
      const badgeDetails = BADGE_DICTIONARY[badgeType];
      if (!badgeDetails) return { error: new Error("Rozet bulunamadı") };

      // Check if user already has this badge
      const { data: existing } = await supabase
        .from("badges")
        .select("id")
        .eq("user_id", userId)
        .eq("badge_type", badgeType)
        .maybeSingle();

      if (existing) {
        return { error: null }; // Already has badge
      }

      // Award badge
      const { error } = await supabase
        .from("badges")
        .insert({
          user_id: userId,
          badge_name: badgeDetails.name,
          badge_type: badgeType,
        });

      console.log("Award badge:", { userId, badgeType, error });
      return { error };
    } catch (error: any) {
      console.error("Award badge error:", error);
      return { error };
    }
  },

  // Get user stats (points, badges, level, rank)
  async getUserStats(userId?: string): Promise<{ data: UserStats | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        return { data: null, error: new Error("Kullanıcı bulunamadı") };
      }

      const [pointsResult, badgesResult] = await Promise.all([
        this.getUserPoints(targetUserId),
        this.getUserBadges(targetUserId),
      ]);

      const totalPoints = pointsResult.data || 0;
      const earnedBadges = badgesResult.data || [];

      // Calculate level (every 100 points = 1 level)
      const level = Math.floor(totalPoints / 100) + 1;

      // Determine rank
      let rank = "Yeni Üye";
      if (totalPoints >= 1000) rank = "Elçi";
      else if (totalPoints >= 500) rank = "Lider";
      else if (totalPoints >= 200) rank = "Aktif";

      const stats: UserStats = {
        totalPoints,
        earnedBadges,
        level,
        rank,
      };

      return { data: stats, error: null };
    } catch (error: any) {
      console.error("Get user stats error:", error);
      return { data: null, error };
    }
  },

  // Get leaderboard (top users by points)
  async getLeaderboard(limit: number = 10): Promise<{ data: any[]; error: any }> {
    try {
      const { data: points, error } = await supabase
        .from("activity_points")
        .select(`
          user_id,
          points,
          profiles!activity_points_user_id_fkey (
            full_name,
            avatar_url,
            profession
          )
        `)
        .order("points", { ascending: false });

      if (error) {
        return { data: [], error };
      }

      // Group by user and sum points
      const userPointsMap = new Map<string, any>();

      points?.forEach((item: any) => {
        const userId = item.user_id;
        if (!userPointsMap.has(userId)) {
          userPointsMap.set(userId, {
            userId,
            totalPoints: 0,
            profile: item.profiles,
          });
        }
        const userStats = userPointsMap.get(userId)!;
        userStats.totalPoints += item.points || 0;
      });

      const leaderboard = Array.from(userPointsMap.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, limit);

      return { data: leaderboard, error: null };
    } catch (error: any) {
      console.error("Get leaderboard error:", error);
      return { data: [], error };
    }
  },
};
