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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      business_credentials: {
        Row: {
          business_id: string
          created_at: string
          credential_type: string
          document_path: string | null
          expires_at: string | null
          id: string
          identifier: string | null
          issued_at: string | null
          issuing_authority: string | null
          private_notes: string | null
          public_display_approved: boolean
          review_status: Database["public"]["Enums"]["credential_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          credential_type: string
          document_path?: string | null
          expires_at?: string | null
          id?: string
          identifier?: string | null
          issued_at?: string | null
          issuing_authority?: string | null
          private_notes?: string | null
          public_display_approved?: boolean
          review_status?: Database["public"]["Enums"]["credential_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          credential_type?: string
          document_path?: string | null
          expires_at?: string | null
          id?: string
          identifier?: string | null
          issued_at?: string | null
          issuing_authority?: string | null
          private_notes?: string | null
          public_display_approved?: boolean
          review_status?: Database["public"]["Enums"]["credential_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_credentials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invitation_status: Database["public"]["Enums"]["invitation_status"]
          invited_by: string | null
          joined_at: string | null
          membership_role: Database["public"]["Enums"]["membership_role"]
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          joined_at?: string | null
          membership_role?: Database["public"]["Enums"]["membership_role"]
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invitation_status?: Database["public"]["Enums"]["invitation_status"]
          invited_by?: string | null
          joined_at?: string | null
          membership_role?: Database["public"]["Enums"]["membership_role"]
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_state: string | null
          cover_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          employee_count_range: string | null
          headline: string | null
          id: string
          legal_name: string
          logo_path: string | null
          primary_industry: string | null
          profile_status: Database["public"]["Enums"]["profile_status"]
          public_email: string | null
          public_phone: string | null
          public_profile_enabled: boolean
          published_at: string | null
          service_areas: string[]
          slug: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          website_url: string | null
          year_founded: number | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          employee_count_range?: string | null
          headline?: string | null
          id?: string
          legal_name: string
          logo_path?: string | null
          primary_industry?: string | null
          profile_status?: Database["public"]["Enums"]["profile_status"]
          public_email?: string | null
          public_phone?: string | null
          public_profile_enabled?: boolean
          published_at?: string | null
          service_areas?: string[]
          slug: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
          year_founded?: number | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          employee_count_range?: string | null
          headline?: string | null
          id?: string
          legal_name?: string
          logo_path?: string | null
          primary_industry?: string | null
          profile_status?: Database["public"]["Enums"]["profile_status"]
          public_email?: string | null
          public_phone?: string | null
          public_profile_enabled?: boolean
          published_at?: string | null
          service_areas?: string[]
          slug?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
          year_founded?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email_display: string | null
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email_display?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email_display?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "member"
        | "business_owner"
        | "business_staff"
        | "moderator"
        | "admin"
      credential_review_status: "pending" | "approved" | "rejected"
      invitation_status: "invited" | "active" | "revoked"
      membership_role:
        | "owner"
        | "manager"
        | "listing_manager"
        | "lead_manager"
        | "viewer"
      onboarding_status:
        | "new"
        | "profile_complete"
        | "business_started"
        | "complete"
      profile_status:
        | "draft"
        | "pending_review"
        | "published"
        | "rejected"
        | "suspended"
        | "archived"
      verification_status:
        | "unverified"
        | "pending"
        | "in_review"
        | "verified"
        | "rejected"
        | "expired"
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
    Enums: {
      app_role: [
        "member",
        "business_owner",
        "business_staff",
        "moderator",
        "admin",
      ],
      credential_review_status: ["pending", "approved", "rejected"],
      invitation_status: ["invited", "active", "revoked"],
      membership_role: [
        "owner",
        "manager",
        "listing_manager",
        "lead_manager",
        "viewer",
      ],
      onboarding_status: [
        "new",
        "profile_complete",
        "business_started",
        "complete",
      ],
      profile_status: [
        "draft",
        "pending_review",
        "published",
        "rejected",
        "suspended",
        "archived",
      ],
      verification_status: [
        "unverified",
        "pending",
        "in_review",
        "verified",
        "rejected",
        "expired",
      ],
    },
  },
} as const
