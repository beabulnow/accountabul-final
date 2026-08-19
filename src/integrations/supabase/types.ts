export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          diff: Json;
          id: string;
          request_id: string | null;
          target_id: string | null;
          target_table: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          diff?: Json;
          id?: string;
          request_id?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          diff?: Json;
          id?: string;
          request_id?: string | null;
          target_id?: string | null;
          target_table?: string | null;
        };
        Relationships: [];
      };
      business_credentials: {
        Row: {
          business_id: string;
          created_at: string;
          credential_type: string;
          document_path: string | null;
          expires_at: string | null;
          id: string;
          identifier: string | null;
          issued_at: string | null;
          issuing_authority: string | null;
          private_notes: string | null;
          public_display_approved: boolean;
          review_status: Database["public"]["Enums"]["credential_review_status"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          submitted_by: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          credential_type: string;
          document_path?: string | null;
          expires_at?: string | null;
          id?: string;
          identifier?: string | null;
          issued_at?: string | null;
          issuing_authority?: string | null;
          private_notes?: string | null;
          public_display_approved?: boolean;
          review_status?: Database["public"]["Enums"]["credential_review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          credential_type?: string;
          document_path?: string | null;
          expires_at?: string | null;
          id?: string;
          identifier?: string | null;
          issued_at?: string | null;
          issuing_authority?: string | null;
          private_notes?: string | null;
          public_display_approved?: boolean;
          review_status?: Database["public"]["Enums"]["credential_review_status"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_credentials_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_follows: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_follows_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          invitation_status: Database["public"]["Enums"]["invitation_status"];
          invited_by: string | null;
          joined_at: string | null;
          membership_role: Database["public"]["Enums"]["membership_role"];
          permissions: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          invitation_status?: Database["public"]["Enums"]["invitation_status"];
          invited_by?: string | null;
          joined_at?: string | null;
          membership_role?: Database["public"]["Enums"]["membership_role"];
          permissions?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          invitation_status?: Database["public"]["Enums"]["invitation_status"];
          invited_by?: string | null;
          joined_at?: string | null;
          membership_role?: Database["public"]["Enums"]["membership_role"];
          permissions?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_state: string | null;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_name: string;
          employee_count_range: string | null;
          headline: string | null;
          id: string;
          legal_name: string;
          logo_path: string | null;
          primary_industry: string | null;
          profile_status: Database["public"]["Enums"]["profile_status"];
          public_email: string | null;
          public_phone: string | null;
          public_profile_enabled: boolean;
          published_at: string | null;
          service_areas: string[];
          slug: string;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          website_url: string | null;
          year_founded: number | null;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_state?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_name: string;
          employee_count_range?: string | null;
          headline?: string | null;
          id?: string;
          legal_name: string;
          logo_path?: string | null;
          primary_industry?: string | null;
          profile_status?: Database["public"]["Enums"]["profile_status"];
          public_email?: string | null;
          public_phone?: string | null;
          public_profile_enabled?: boolean;
          published_at?: string | null;
          service_areas?: string[];
          slug: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          website_url?: string | null;
          year_founded?: number | null;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_state?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_name?: string;
          employee_count_range?: string | null;
          headline?: string | null;
          id?: string;
          legal_name?: string;
          logo_path?: string | null;
          primary_industry?: string | null;
          profile_status?: Database["public"]["Enums"]["profile_status"];
          public_email?: string | null;
          public_phone?: string | null;
          public_profile_enabled?: boolean;
          published_at?: string | null;
          service_areas?: string[];
          slug?: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          website_url?: string | null;
          year_founded?: number | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          body: string;
          created_at: string;
          event_id: string;
          id: string;
          is_hidden: boolean;
          kind: string;
          metadata: Json;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          event_id: string;
          id?: string;
          is_hidden?: boolean;
          kind?: string;
          metadata?: Json;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          is_hidden?: boolean;
          kind?: string;
          metadata?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_moderation_actions: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          event_id: string | null;
          expires_at: string | null;
          id: string;
          reason: string | null;
          target_user_id: string;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at?: string | null;
          id?: string;
          reason?: string | null;
          target_user_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          event_id?: string | null;
          expires_at?: string | null;
          id?: string;
          reason?: string | null;
          target_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_moderation_actions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_presence: {
        Row: {
          event_id: string;
          id: string;
          last_seen_at: string;
          user_id: string;
        };
        Insert: {
          event_id: string;
          id?: string;
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          event_id?: string;
          id?: string;
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_presence_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_reminders: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_reminders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          actual_start_at: string | null;
          chat_enabled: boolean;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          embed_url: string | null;
          ended_at: string | null;
          host_business_id: string | null;
          id: string;
          provider: string | null;
          provider_account_id: string | null;
          provider_record_id: string | null;
          replay_url_path: string | null;
          scheduled_start_at: string | null;
          slug: string;
          status: Database["public"]["Enums"]["event_status"];
          tips_enabled: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          actual_start_at?: string | null;
          chat_enabled?: boolean;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          embed_url?: string | null;
          ended_at?: string | null;
          host_business_id?: string | null;
          id?: string;
          provider?: string | null;
          provider_account_id?: string | null;
          provider_record_id?: string | null;
          replay_url_path?: string | null;
          scheduled_start_at?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["event_status"];
          tips_enabled?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          actual_start_at?: string | null;
          chat_enabled?: boolean;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          embed_url?: string | null;
          ended_at?: string | null;
          host_business_id?: string | null;
          id?: string;
          provider?: string | null;
          provider_account_id?: string | null;
          provider_record_id?: string | null;
          replay_url_path?: string | null;
          scheduled_start_at?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["event_status"];
          tips_enabled?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_host_business_id_fkey";
            columns: ["host_business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      fxrp_acceptance_batch_members: {
        Row: {
          batch_id: string;
          created_at: string;
          position: number;
          reservation_id: string;
        };
        Insert: {
          batch_id: string;
          created_at?: string;
          position: number;
          reservation_id: string;
        };
        Update: {
          batch_id?: string;
          created_at?: string;
          position?: number;
          reservation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fxrp_acceptance_batch_members_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "fxrp_acceptance_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fxrp_acceptance_batch_members_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: true;
            referencedRelation: "xrp_acceptance_reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      fxrp_acceptance_batches: {
        Row: {
          created_at: string;
          execution_evidence: Json;
          expense_reserve_drops: number;
          expires_at: string;
          failure_code: string | null;
          id: string;
          idempotency_key: string;
          maximum_profit_payment_drops: number;
          maximum_xrpl_fee_drops: number;
          minimum_profit_payment_drops: number;
          profit_wallet_address: string;
          quote_expires_at: string;
          route: Json;
          route_profile: string;
          settled_at: string | null;
          settlement_amount_drops: number;
          settlement_wallet_address: string;
          slippage_bps: number;
          source_amount_base_units: number;
          source_asset_key: string;
          source_decimals: number;
          source_destination: string;
          status: string;
          total_fees_bps: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          execution_evidence?: Json;
          expense_reserve_drops: number;
          expires_at: string;
          failure_code?: string | null;
          id: string;
          idempotency_key: string;
          maximum_profit_payment_drops: number;
          maximum_xrpl_fee_drops: number;
          minimum_profit_payment_drops: number;
          profit_wallet_address: string;
          quote_expires_at: string;
          route: Json;
          route_profile: string;
          settled_at?: string | null;
          settlement_amount_drops: number;
          settlement_wallet_address: string;
          slippage_bps: number;
          source_amount_base_units: number;
          source_asset_key: string;
          source_decimals: number;
          source_destination: string;
          status: string;
          total_fees_bps: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          execution_evidence?: Json;
          expense_reserve_drops?: number;
          expires_at?: string;
          failure_code?: string | null;
          id?: string;
          idempotency_key?: string;
          maximum_profit_payment_drops?: number;
          maximum_xrpl_fee_drops?: number;
          minimum_profit_payment_drops?: number;
          profit_wallet_address?: string;
          quote_expires_at?: string;
          route?: Json;
          route_profile?: string;
          settled_at?: string | null;
          settlement_amount_drops?: number;
          settlement_wallet_address?: string;
          slippage_bps?: number;
          source_amount_base_units?: number;
          source_asset_key?: string;
          source_decimals?: number;
          source_destination?: string;
          status?: string;
          total_fees_bps?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      fxrp_conversion_runs: {
        Row: {
          conversion_id: string;
          created_at: string;
          environment: string;
          evidence: Json;
          intent: Json;
          last_error: Json | null;
          status: string;
          updated_at: string;
          user_id: string;
          version: number;
        };
        Insert: {
          conversion_id: string;
          created_at?: string;
          environment?: string;
          evidence?: Json;
          intent: Json;
          last_error?: Json | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          version?: number;
        };
        Update: {
          conversion_id?: string;
          created_at?: string;
          environment?: string;
          evidence?: Json;
          intent?: Json;
          last_error?: Json | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [];
      };
      fxrp_signer_nonces: {
        Row: {
          last_nonce: number;
          signer_address: string;
          updated_at: string;
        };
        Insert: {
          last_nonce: number;
          signer_address: string;
          updated_at?: string;
        };
        Update: {
          last_nonce?: number;
          signer_address?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      migration_batches: {
        Row: {
          dry_run: boolean;
          finished_at: string | null;
          id: string;
          notes: string | null;
          source_system: string;
          started_at: string;
          status: string;
        };
        Insert: {
          dry_run?: boolean;
          finished_at?: string | null;
          id?: string;
          notes?: string | null;
          source_system: string;
          started_at?: string;
          status?: string;
        };
        Update: {
          dry_run?: boolean;
          finished_at?: string | null;
          id?: string;
          notes?: string | null;
          source_system?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      migration_record_map: {
        Row: {
          batch_id: string | null;
          id: string;
          legacy_id: string;
          migrated_at: string;
          source_system: string;
          target_id: string | null;
          target_table: string;
        };
        Insert: {
          batch_id?: string | null;
          id?: string;
          legacy_id: string;
          migrated_at?: string;
          source_system: string;
          target_id?: string | null;
          target_table: string;
        };
        Update: {
          batch_id?: string | null;
          id?: string;
          legacy_id?: string;
          migrated_at?: string;
          source_system?: string;
          target_id?: string | null;
          target_table?: string;
        };
        Relationships: [
          {
            foreignKeyName: "migration_record_map_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "migration_batches";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_type: string | null;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          provider_event_id: string;
          tip_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_type?: string | null;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider: string;
          provider_event_id: string;
          tip_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string | null;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          provider_event_id?: string;
          tip_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_tip_id_fkey";
            columns: ["tip_id"];
            isOneToOne: false;
            referencedRelation: "tips";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          display_name: string | null;
          email_display: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          onboarding_status: Database["public"]["Enums"]["onboarding_status"];
          phone: string | null;
          state: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_display?: string | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"];
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          email_display?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"];
          phone?: string | null;
          state?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_line1: string | null;
          address_state: string | null;
          archived_at: string | null;
          area_sqft: number | null;
          bathrooms: number | null;
          bedrooms: number | null;
          business_id: string;
          cover_path: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          postal_code: string | null;
          price_minor: number | null;
          property_type: string | null;
          published_at: string | null;
          slug: string;
          status: Database["public"]["Enums"]["property_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          address_city?: string | null;
          address_country?: string | null;
          address_line1?: string | null;
          address_state?: string | null;
          archived_at?: string | null;
          area_sqft?: number | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          business_id: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          postal_code?: string | null;
          price_minor?: number | null;
          property_type?: string | null;
          published_at?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["property_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          address_city?: string | null;
          address_country?: string | null;
          address_line1?: string | null;
          address_state?: string | null;
          archived_at?: string | null;
          area_sqft?: number | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          business_id?: string;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          postal_code?: string | null;
          price_minor?: number | null;
          property_type?: string | null;
          published_at?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["property_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      property_inquiries: {
        Row: {
          business_id: string;
          contact_email: string;
          contact_name: string;
          contact_phone: string | null;
          created_at: string;
          from_user_id: string | null;
          id: string;
          message: string;
          property_id: string;
          status: Database["public"]["Enums"]["inquiry_status"];
          updated_at: string;
        };
        Insert: {
          business_id: string;
          contact_email: string;
          contact_name: string;
          contact_phone?: string | null;
          created_at?: string;
          from_user_id?: string | null;
          id?: string;
          message: string;
          property_id: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string | null;
          created_at?: string;
          from_user_id?: string | null;
          id?: string;
          message?: string;
          property_id?: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_inquiries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_inquiries_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      property_media: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          property_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          property_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          property_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_properties: {
        Row: {
          created_at: string;
          id: string;
          property_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          property_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          property_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      service_inquiries: {
        Row: {
          business_id: string;
          contact_email: string;
          contact_name: string;
          contact_phone: string | null;
          created_at: string;
          from_user_id: string | null;
          id: string;
          message: string;
          service_id: string;
          status: Database["public"]["Enums"]["inquiry_status"];
          updated_at: string;
        };
        Insert: {
          business_id: string;
          contact_email: string;
          contact_name: string;
          contact_phone?: string | null;
          created_at?: string;
          from_user_id?: string | null;
          id?: string;
          message: string;
          service_id: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string | null;
          created_at?: string;
          from_user_id?: string | null;
          id?: string;
          message?: string;
          service_id?: string;
          status?: Database["public"]["Enums"]["inquiry_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_inquiries_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_inquiries_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          business_id: string;
          category: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          id: string;
          name: string;
          price_minor: number | null;
          price_note: string | null;
          published_at: string | null;
          service_areas: string[];
          slug: string;
          status: Database["public"]["Enums"]["service_status"];
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          name: string;
          price_minor?: number | null;
          price_note?: string | null;
          published_at?: string | null;
          service_areas?: string[];
          slug: string;
          status?: Database["public"]["Enums"]["service_status"];
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          id?: string;
          name?: string;
          price_minor?: number | null;
          price_note?: string | null;
          published_at?: string | null;
          service_areas?: string[];
          slug?: string;
          status?: Database["public"]["Enums"]["service_status"];
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      tips: {
        Row: {
          amount_minor: number;
          created_at: string;
          currency: string;
          event_id: string | null;
          from_user_id: string | null;
          id: string;
          idempotency_key: string;
          message: string | null;
          paid_at: string | null;
          provider: string | null;
          provider_record_id: string | null;
          status: Database["public"]["Enums"]["tip_status"];
          to_business_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount_minor: number;
          created_at?: string;
          currency?: string;
          event_id?: string | null;
          from_user_id?: string | null;
          id?: string;
          idempotency_key: string;
          message?: string | null;
          paid_at?: string | null;
          provider?: string | null;
          provider_record_id?: string | null;
          status?: Database["public"]["Enums"]["tip_status"];
          to_business_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          event_id?: string | null;
          from_user_id?: string | null;
          id?: string;
          idempotency_key?: string;
          message?: string | null;
          paid_at?: string | null;
          provider?: string | null;
          provider_record_id?: string | null;
          status?: Database["public"]["Enums"]["tip_status"];
          to_business_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tips_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_to_business_id_fkey";
            columns: ["to_business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          id: string;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          id?: string;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      xrp_acceptance_policies: {
        Row: {
          created_at: string;
          enabled: boolean;
          environment: string;
          maximum_overpayment_bps: number;
          maximum_payment_drops: number;
          maximum_slippage_bps: number;
          maximum_total_fees_bps: number;
          minimum_payment_drops: number;
          open_exposure_limit_drops: number;
          rolling_24_hour_limit_drops: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          environment?: string;
          maximum_overpayment_bps?: number;
          maximum_payment_drops: number;
          maximum_slippage_bps: number;
          maximum_total_fees_bps: number;
          minimum_payment_drops: number;
          open_exposure_limit_drops: number;
          rolling_24_hour_limit_drops: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          environment?: string;
          maximum_overpayment_bps?: number;
          maximum_payment_drops?: number;
          maximum_slippage_bps?: number;
          maximum_total_fees_bps?: number;
          minimum_payment_drops?: number;
          open_exposure_limit_drops?: number;
          rolling_24_hour_limit_drops?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      xrp_acceptance_reservations: {
        Row: {
          created_at: string;
          execution_evidence: Json;
          expense_reserve_drops: number | null;
          expires_at: string;
          failure_code: string | null;
          funding_evidence: Json;
          id: string;
          idempotency_key: string;
          invoice_id: string;
          maximum_profit_payment_drops: number | null;
          maximum_xrpl_fee_drops: number | null;
          minimum_profit_payment_drops: number | null;
          profit_wallet_address: string | null;
          quote_expires_at: string;
          released_at: string | null;
          route: Json;
          route_profile: string;
          settled_at: string | null;
          settlement_amount_drops: number;
          settlement_wallet_address: string | null;
          slippage_bps: number;
          source_amount_base_units: number;
          source_asset_key: string;
          source_decimals: number | null;
          source_destination: string | null;
          source_sender: string | null;
          status: string;
          total_fees_bps: number;
          updated_at: string;
          user_id: string;
          xrpl_destination: string | null;
          xrpl_destination_tag: number | null;
        };
        Insert: {
          created_at?: string;
          execution_evidence?: Json;
          expense_reserve_drops?: number | null;
          expires_at: string;
          failure_code?: string | null;
          funding_evidence?: Json;
          id?: string;
          idempotency_key: string;
          invoice_id: string;
          maximum_profit_payment_drops?: number | null;
          maximum_xrpl_fee_drops?: number | null;
          minimum_profit_payment_drops?: number | null;
          profit_wallet_address?: string | null;
          quote_expires_at: string;
          released_at?: string | null;
          route: Json;
          route_profile: string;
          settled_at?: string | null;
          settlement_amount_drops: number;
          settlement_wallet_address?: string | null;
          slippage_bps: number;
          source_amount_base_units: number;
          source_asset_key: string;
          source_decimals?: number | null;
          source_destination?: string | null;
          source_sender?: string | null;
          status?: string;
          total_fees_bps: number;
          updated_at?: string;
          user_id: string;
          xrpl_destination?: string | null;
          xrpl_destination_tag?: number | null;
        };
        Update: {
          created_at?: string;
          execution_evidence?: Json;
          expense_reserve_drops?: number | null;
          expires_at?: string;
          failure_code?: string | null;
          funding_evidence?: Json;
          id?: string;
          idempotency_key?: string;
          invoice_id?: string;
          maximum_profit_payment_drops?: number | null;
          maximum_xrpl_fee_drops?: number | null;
          minimum_profit_payment_drops?: number | null;
          profit_wallet_address?: string | null;
          quote_expires_at?: string;
          released_at?: string | null;
          route?: Json;
          route_profile?: string;
          settled_at?: string | null;
          settlement_amount_drops?: number;
          settlement_wallet_address?: string | null;
          slippage_bps?: number;
          source_amount_base_units?: number;
          source_asset_key?: string;
          source_decimals?: number | null;
          source_destination?: string | null;
          source_sender?: string | null;
          status?: string;
          total_fees_bps?: number;
          updated_at?: string;
          user_id?: string;
          xrpl_destination?: string | null;
          xrpl_destination_tag?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "xrp_acceptance_reservations_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "xrp_settlement_invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      xrp_accepted_assets: {
        Row: {
          asset_key: string;
          created_at: string;
          enabled: boolean;
          route_profile: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          asset_key: string;
          created_at?: string;
          enabled?: boolean;
          route_profile: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          asset_key?: string;
          created_at?: string;
          enabled?: boolean;
          route_profile?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      xrp_settlement_invoices: {
        Row: {
          created_at: string;
          expires_at: string;
          external_reference: string;
          id: string;
          settled_amount_drops: number;
          status: string;
          target_amount_drops: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          external_reference: string;
          id?: string;
          settled_amount_drops?: number;
          status?: string;
          target_amount_drops: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          external_reference?: string;
          id?: string;
          settled_amount_drops?: number;
          status?: string;
          target_amount_drops?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_business_credentials: {
        Row: {
          business_id: string | null;
          credential_type: string | null;
          expires_at: string | null;
          identifier: string | null;
          issued_at: string | null;
          issuing_authority: string | null;
        };
        Relationships: [];
      };
      public_businesses: {
        Row: {
          address_city: string | null;
          address_country: string | null;
          address_state: string | null;
          cover_path: string | null;
          description: string | null;
          display_name: string | null;
          employee_count_range: string | null;
          headline: string | null;
          id: string | null;
          logo_path: string | null;
          primary_industry: string | null;
          profile_status: Database["public"]["Enums"]["profile_status"] | null;
          public_email: string | null;
          public_phone: string | null;
          public_profile_enabled: boolean | null;
          published_at: string | null;
          service_areas: string[] | null;
          slug: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"] | null;
          website_url: string | null;
          year_founded: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      can_manage_business: {
        Args: { _business_id: string; _user_id: string };
        Returns: boolean;
      };
      claim_fxrp_acceptance: {
        Args: { p_reservation_id: string };
        Returns: Json;
      };
      claim_fxrp_acceptance_batch: {
        Args: {
          p_batch_id: string;
          p_idempotency_key: string;
          p_reservation_ids: string[];
        };
        Returns: Json;
      };
      claim_next_fxrp_acceptance_batch:
        | {
            Args: {
              p_maximum_members?: number;
              p_minimum_members?: number;
              p_minimum_source_amount_base_units: number;
              p_source_destination: string;
            };
            Returns: string;
          }
        | {
            Args: {
              p_maximum_members?: number;
              p_minimum_members?: number;
              p_minimum_source_amount_base_units: number;
              p_required_slippage_bps: number;
              p_source_destination: string;
            };
            Returns: string;
          };
      create_business_with_owner: {
        Args: {
          _address_city?: string;
          _address_country?: string;
          _address_state?: string;
          _description?: string;
          _display_name: string;
          _headline?: string;
          _legal_name: string;
          _primary_industry?: string;
          _public_email?: string;
          _public_phone?: string;
          _slug: string;
          _website_url?: string;
        };
        Returns: string;
      };
      get_my_business_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          business_id: string;
          business_name: string;
          invited_at: string;
          membership_id: string;
          membership_role: Database["public"]["Enums"]["membership_role"];
        }[];
      };
      touch_event_presence: {
        Args: { _event_id: string };
        Returns: number;
      };
      invite_business_member: {
        Args: {
          _business_id: string;
          _email: string;
          _role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: string;
      };
      finalize_fxrp_acceptance: {
        Args: { p_reservation_id: string };
        Returns: string;
      };
      finalize_fxrp_acceptance_batch: {
        Args: { p_batch_id: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_business_member: {
        Args: { _business_id: string; _user_id: string };
        Returns: boolean;
      };
      is_business_owner: {
        Args: { _business_id: string; _user_id: string };
        Returns: boolean;
      };
      is_chat_banned: {
        Args: { _event_id: string; _user_id: string };
        Returns: boolean;
      };
      list_fxrp_acceptances_for_funding: {
        Args: { p_limit?: number; p_source_destination: string };
        Returns: string[];
      };
      read_fxrp_acceptance: {
        Args: { p_reservation_id: string };
        Returns: Json;
      };
      read_fxrp_acceptance_batch: {
        Args: { p_batch_id: string };
        Returns: Json;
      };
      record_xrp_acceptance_funding: {
        Args: { p_funding_evidence: Json; p_reservation_id: string };
        Returns: string;
      };
      reserve_fxrp_signer_nonce: {
        Args: { p_floor_nonce: number; p_signer_address: string };
        Returns: number;
      };
      reserve_xrp_acceptance:
        | {
            Args: {
              p_idempotency_key: string;
              p_invoice_id: string;
              p_quote_expires_at: string;
              p_reservation_expires_at: string;
              p_route: Json;
              p_route_profile: string;
              p_settlement_amount_drops: number;
              p_slippage_bps: number;
              p_source_amount_base_units: number;
              p_source_asset_key: string;
              p_source_decimals: number;
              p_source_destination: string;
              p_source_sender: string;
              p_total_fees_bps: number;
              p_xrpl_destination: string;
              p_xrpl_destination_tag: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_expense_reserve_drops: number;
              p_idempotency_key: string;
              p_invoice_id: string;
              p_maximum_profit_payment_drops: number;
              p_maximum_xrpl_fee_drops: number;
              p_minimum_profit_payment_drops: number;
              p_profit_wallet_address: string;
              p_quote_expires_at: string;
              p_reservation_expires_at: string;
              p_route: Json;
              p_route_profile: string;
              p_settlement_amount_drops: number;
              p_settlement_wallet_address: string;
              p_slippage_bps: number;
              p_source_amount_base_units: number;
              p_source_asset_key: string;
              p_source_decimals: number;
              p_source_destination: string;
              p_source_sender: string;
              p_total_fees_bps: number;
              p_xrpl_destination: string;
              p_xrpl_destination_tag: number;
            };
            Returns: string;
          };
      review_business: {
        Args: { _business_id: string; _decision: string };
        Returns: undefined;
      };
      review_business_credential: {
        Args: { _credential_id: string; _decision: string };
        Returns: undefined;
      };
      review_property: {
        Args: { _decision: string; _property_id: string };
        Returns: undefined;
      };
      review_service: {
        Args: { _decision: string; _service_id: string };
        Returns: undefined;
      };
      respond_to_business_invitation: {
        Args: { _accept: boolean; _membership_id: string };
        Returns: string;
      };
      revoke_business_member: {
        Args: { _membership_id: string };
        Returns: undefined;
      };
      send_chat_message: {
        Args: { _body: string; _event_id: string };
        Returns: {
          body: string;
          created_at: string;
          event_id: string;
          id: string;
          is_hidden: boolean;
          kind: string;
          metadata: Json;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "chat_messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_business_member_role: {
        Args: {
          _membership_id: string;
          _role: Database["public"]["Enums"]["membership_role"];
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "member" | "business_owner" | "business_staff" | "moderator" | "admin";
      credential_review_status: "pending" | "approved" | "rejected";
      event_status: "scheduled" | "live" | "ended" | "canceled" | "replay_available";
      inquiry_status: "new" | "contacted" | "qualified" | "won" | "lost" | "spam";
      invitation_status: "invited" | "active" | "revoked";
      membership_role: "owner" | "manager" | "listing_manager" | "lead_manager" | "viewer";
      onboarding_status: "new" | "profile_complete" | "business_started" | "complete";
      profile_status:
        "draft" | "pending_review" | "published" | "rejected" | "suspended" | "archived";
      property_status: "draft" | "pending_review" | "published" | "rejected" | "archived";
      service_status: "draft" | "pending_review" | "published" | "rejected" | "archived";
      tip_status: "created" | "processing" | "paid" | "failed" | "refunded";
      verification_status:
        "unverified" | "pending" | "in_review" | "verified" | "rejected" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["member", "business_owner", "business_staff", "moderator", "admin"],
      credential_review_status: ["pending", "approved", "rejected"],
      event_status: ["scheduled", "live", "ended", "canceled", "replay_available"],
      inquiry_status: ["new", "contacted", "qualified", "won", "lost", "spam"],
      invitation_status: ["invited", "active", "revoked"],
      membership_role: ["owner", "manager", "listing_manager", "lead_manager", "viewer"],
      onboarding_status: ["new", "profile_complete", "business_started", "complete"],
      profile_status: ["draft", "pending_review", "published", "rejected", "suspended", "archived"],
      property_status: ["draft", "pending_review", "published", "rejected", "archived"],
      service_status: ["draft", "pending_review", "published", "rejected", "archived"],
      tip_status: ["created", "processing", "paid", "failed", "refunded"],
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
} as const;
