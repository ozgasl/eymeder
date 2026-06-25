 
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_points: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          points: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_name: string
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          discount_info: string
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_info: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_info?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          is_approved: boolean | null
          location: string | null
          organizer_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          location?: string | null
          organizer_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_approved?: boolean | null
          location?: string | null
          organizer_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "group_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          applied_at: string | null
          cover_letter: string | null
          id: string
          job_id: string
          resume_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          applied_at?: string | null
          cover_letter?: string | null
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          applied_at?: string | null
          cover_letter?: string | null
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_deadline: string | null
          benefits: string | null
          company: string
          created_at: string | null
          description: string
          experience_level: string | null
          id: string
          is_active: boolean | null
          job_type: string | null
          location: string | null
          posted_by: string
          requirements: string | null
          salary_range: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_deadline?: string | null
          benefits?: string | null
          company: string
          created_at?: string | null
          description: string
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_by: string
          requirements?: string | null
          salary_range?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_deadline?: string | null
          benefits?: string | null
          company?: string
          created_at?: string | null
          description?: string
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_by?: string
          requirements?: string | null
          salary_range?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_referrals: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          message: string | null
          referee_email: string
          referee_name: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          message?: string | null
          referee_email: string
          referee_name: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          message?: string | null
          referee_email?: string
          referee_name?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_referrals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_gallery: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          likes_count: number | null
          media_type: string
          media_url: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          likes_count?: number | null
          media_type: string
          media_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          likes_count?: number | null
          media_type?: string
          media_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_gallery_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_likes: {
        Row: {
          created_at: string | null
          id: string
          media_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_likes_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_gallery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_numbers: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_used: boolean | null
          membership_number: string
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_used?: boolean | null
          membership_number: string
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_used?: boolean | null
          membership_number?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_numbers_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string | null
          id: string
          mentee_id: string
          mentor_id: string
          message: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          message: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          message?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string | null
          id: string
          published: boolean | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          published?: boolean | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          published?: boolean | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          iyzico_conversation_id: string | null
          iyzico_payment_id: string | null
          notes: string | null
          order_number: string
          payment_method: string
          payment_proof_url: string | null
          payment_status: string
          shipping_address: string
          shipping_city: string
          shipping_phone: string
          shipping_zip: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          iyzico_conversation_id?: string | null
          iyzico_payment_id?: string | null
          notes?: string | null
          order_number: string
          payment_method: string
          payment_proof_url?: string | null
          payment_status?: string
          shipping_address: string
          shipping_city: string
          shipping_phone: string
          shipping_zip?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          iyzico_conversation_id?: string | null
          iyzico_payment_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_status?: string
          shipping_address?: string
          shipping_city?: string
          shipping_phone?: string
          shipping_zip?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          link_code: string
          order_id: string | null
          used_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          link_code: string
          order_id?: string | null
          used_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          link_code?: string
          order_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          post_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          post_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          post_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          department: string | null
          email: string | null
          facebook_url: string | null
          full_name: string | null
          graduation_year: number | null
          high_school_graduation_year: number | null
          id: string
          instagram_url: string | null
          is_mentor: boolean | null
          linkedin_url: string | null
          membership_number: string | null
          mentor_bio: string | null
          mentorship_areas: string[] | null
          phone: string | null
          profession: string | null
          twitter_url: string | null
          university: string | null
          university_graduation_year: number | null
          university_status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          graduation_year?: number | null
          high_school_graduation_year?: number | null
          id: string
          instagram_url?: string | null
          is_mentor?: boolean | null
          linkedin_url?: string | null
          membership_number?: string | null
          mentor_bio?: string | null
          mentorship_areas?: string[] | null
          phone?: string | null
          profession?: string | null
          twitter_url?: string | null
          university?: string | null
          university_graduation_year?: number | null
          university_status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          facebook_url?: string | null
          full_name?: string | null
          graduation_year?: number | null
          high_school_graduation_year?: number | null
          id?: string
          instagram_url?: string | null
          is_mentor?: boolean | null
          linkedin_url?: string | null
          membership_number?: string | null
          mentor_bio?: string | null
          mentorship_areas?: string[] | null
          phone?: string | null
          profession?: string | null
          twitter_url?: string | null
          university?: string | null
          university_graduation_year?: number | null
          university_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_membership_number_fkey"
            columns: ["membership_number"]
            isOneToOne: true
            referencedRelation: "membership_numbers"
            referencedColumns: ["membership_number"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          achievement: string | null
          approved: boolean | null
          created_at: string | null
          current_position: string | null
          featured: boolean | null
          id: string
          quote: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement?: string | null
          approved?: boolean | null
          created_at?: string | null
          current_position?: string | null
          featured?: boolean | null
          id?: string
          quote: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement?: string | null
          approved?: boolean | null
          created_at?: string | null
          current_position?: string | null
          featured?: boolean | null
          id?: string
          quote?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_qr_codes: {
        Row: {
          created_at: string | null
          id: string
          qr_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          qr_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          qr_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_qr_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_media_likes: { Args: { media_id: string }; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      increment_media_likes: { Args: { media_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
