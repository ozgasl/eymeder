import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Dynamic URL Helper
const getURL = () => {
  let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
           process?.env?.NEXT_PUBLIC_SITE_URL ?? 
           'http://localhost:3000'
  
  // Handle undefined or null url
  if (!url) {
    url = 'http://localhost:3000';
  }
  
  // Ensure url has protocol
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Ensure url ends with slash
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

export async function loginWithMembershipNumber(email: string, membershipNumber: string) {
  try {
    // First validate membership number
    const { data: membershipData, error: membershipError } = await supabase
      .from("membership_numbers")
      .select("is_used")
      .eq("membership_number", membershipNumber)
      .eq("email", email)
      .single();

    if (membershipError || !membershipData) {
      return { 
        user: null, 
        session: null, 
        error: new Error("Geçersiz üyelik numarası veya e-posta") 
      };
    }

    if (!membershipData.is_used) {
      return { 
        user: null, 
        session: null, 
        error: new Error("Bu hesap henüz oluşturulmamış. Lütfen önce kayıt olun.") 
      };
    }

    // Use membership number as password for login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: membershipNumber,
    });

    return { user: data.user, session: data.session, error };
  } catch (error: any) {
    console.error("Login with membership number error:", error);
    return { user: null, session: null, error };
  }
}

export async function signupWithMembershipNumber({
  email,
  password,
  membershipNumber,
  fullName,
  phone,
}: {
  email: string;
  password: string;
  membershipNumber: string;
  fullName: string;
  phone?: string;
}) {
  try {
    // Create auth user with password
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          membership_number: membershipNumber,
        },
      },
    });

    if (authError) {
      return { user: null, session: null, error: authError };
    }

    if (!authData.user) {
      return { 
        user: null, 
        session: null, 
        error: new Error("Kullanıcı oluşturulamadı") 
      };
    }

    // Update profile with additional data
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        membership_number: membershipNumber,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Mark membership number as used
    const { error: membershipError } = await supabase
      .from("membership_numbers")
      .update({
        is_used: true,
        used_by: authData.user.id,
      })
      .eq("membership_number", membershipNumber);

    if (membershipError) {
      console.error("Membership number update error:", membershipError);
    }

    return { user: authData.user, session: authData.session, error: null };
  } catch (error: any) {
    console.error("Signup with membership number error:", error);
    return { user: null, session: null, error };
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { user: data.user, session: data.session, error };
  } catch (error: any) {
    console.error("Email login error:", error);
    return { user: null, session: null, error };
  }
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? {
      id: user.id,
      email: user.email || "",
      user_metadata: user.user_metadata,
      created_at: user.created_at
    } : null;
  },

  // Get current session
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/confirm-email`
        }
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign up" } 
      };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign in" } 
      };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during sign out" } 
      };
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during password reset" } 
      };
    }
  },

  // Confirm email (REQUIRED)
  async confirmEmail(token: string, type: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during email confirmation" } 
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};
