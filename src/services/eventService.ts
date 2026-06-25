import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type EventAttendee = Database["public"]["Tables"]["event_attendees"]["Row"];

export const eventService = {
  // Get all events
  async getEvents(): Promise<{ data: Event[] | null; error: any }> {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles!events_organizer_id_fkey(id, full_name, avatar_url),
        event_attendees(count)
      `)
      .order("event_date", { ascending: true });

    console.log("getEvents:", { data, error });
    return { data: Array.isArray(data) ? data : [], error };
  },

  // Get upcoming events
  async getUpcomingEvents(limit = 3): Promise<{ data: Event[] | null; error: any }> {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles!events_organizer_id_fkey(id, full_name, avatar_url),
        event_attendees(count)
      `)
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(limit);

    console.log("getUpcomingEvents:", { data, error });
    return { data: Array.isArray(data) ? data : [], error };
  },

  async getEventById(eventId: string) {
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        organizer:profiles!events_organizer_id_fkey(id, full_name, avatar_url),
        event_attendees(
          id,
          status,
          user:profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)
        )
      `)
      .eq("id", eventId)
      .single();

    return { data, error };
  },

  // Create event
  async createEvent(event: any): Promise<{ data: Event | null; error: any }> {
    try {
      // Combine date and time into event_date timestamp
      let eventDate = event.date;
      if (event.time) {
        eventDate = `${event.date}T${event.time}:00`;
      } else {
        eventDate = `${event.date}T00:00:00`;
      }

      // Map form fields to database columns
      const dbEvent = {
        title: event.title,
        description: event.description || null,
        event_date: eventDate,
        location: event.location || null,
        capacity: event.max_attendees || null,
        image_url: event.image_url || null,
        organizer_id: event.organizer_id,
        is_approved: true, // Default to approved so it shows up immediately
      };

      console.log("Mapped event data for database:", dbEvent);

      const { data, error } = await supabase
        .from("events")
        .insert(dbEvent)
        .select()
        .single();

      console.log("createEvent result:", { data, error });
      return { data, error };
    } catch (err: any) {
      console.error("createEvent service error:", err);
      return { data: null, error: err };
    }
  },

  async updateEvent(eventId: string, updates: EventUpdate) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    return { data, error };
  },

  async deleteEvent(eventId: string) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    return { error };
  },

  async rsvpToEvent(eventId: string, status: "attending" | "maybe" | "not_attending") {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("event_attendees")
      .upsert({
        event_id: eventId,
        user_id: user?.id,
        status,
      })
      .select()
      .single();

    return { data, error };
  },

  async removeRSVP(eventId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("event_attendees")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user?.id);

    return { error };
  },

  async getUserRSVP(eventId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("event_attendees")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user?.id)
      .maybeSingle();

    return { data, error };
  },

  async getMyEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_attendees(count)
      `)
      .eq("organizer_id", user?.id)
      .order("event_date", { ascending: false });

    return { data, error };
  },
};