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
      admin_accounts: {
        Row: {
          admin_role: string | null
          created_at: string | null
          id: string
          permissions: Json | null
          user_id: string | null
        }
        Insert: {
          admin_role?: string | null
          created_at?: string | null
          id?: string
          permissions?: Json | null
          user_id?: string | null
        }
        Update: {
          admin_role?: string | null
          created_at?: string | null
          id?: string
          permissions?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_updates: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_updates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_hours: number | null
          additional_services: Json | null
          admin_confirmed: boolean | null
          booking_country: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          customer_confirmation: boolean | null
          customer_confirmed: boolean | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          distance_km: number | null
          driver_confirmation: boolean | null
          driver_earning: number | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_city: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_postcode: string | null
          duration_hours: number | null
          duration_minutes: number | null
          email: string | null
          end_time: string | null
          escrow_activated: boolean | null
          estimated_hours: number | null
          final_price: number | null
          helpers: number | null
          hourly_rate: number | null
          id: string
          items: Json | null
          move_date: string | null
          move_time: string | null
          move_type: string | null
          name: string | null
          original_price: number | null
          payment_intent_id: string | null
          payment_provider: string | null
          payment_status: string | null
          phone: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_postcode: string | null
          price_adjusted: boolean | null
          price_estimate: number | null
          start_time: string | null
          status: string | null
          stripe_session_id: string | null
          updated_at: string | null
          van_type: string | null
        }
        Insert: {
          actual_hours?: number | null
          additional_services?: Json | null
          admin_confirmed?: boolean | null
          booking_country?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          customer_confirmation?: boolean | null
          customer_confirmed?: boolean | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          driver_confirmation?: boolean | null
          driver_earning?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_postcode?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          email?: string | null
          end_time?: string | null
          escrow_activated?: boolean | null
          estimated_hours?: number | null
          final_price?: number | null
          helpers?: number | null
          hourly_rate?: number | null
          id?: string
          items?: Json | null
          move_date?: string | null
          move_time?: string | null
          move_type?: string | null
          name?: string | null
          original_price?: number | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          phone?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_postcode?: string | null
          price_adjusted?: boolean | null
          price_estimate?: number | null
          start_time?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          van_type?: string | null
        }
        Update: {
          actual_hours?: number | null
          additional_services?: Json | null
          admin_confirmed?: boolean | null
          booking_country?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          customer_confirmation?: boolean | null
          customer_confirmed?: boolean | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          distance_km?: number | null
          driver_confirmation?: boolean | null
          driver_earning?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_postcode?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          email?: string | null
          end_time?: string | null
          escrow_activated?: boolean | null
          estimated_hours?: number | null
          final_price?: number | null
          helpers?: number | null
          hourly_rate?: number | null
          id?: string
          items?: Json | null
          move_date?: string | null
          move_time?: string | null
          move_type?: string | null
          name?: string | null
          original_price?: number | null
          payment_intent_id?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          phone?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_postcode?: string | null
          price_adjusted?: boolean | null
          price_estimate?: number | null
          start_time?: string | null
          status?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          van_type?: string | null
        }
        Relationships: []
      }
      cities_pricing: {
        Row: {
          city_slug: string
          country_code: string
          display_name: string
          id: number
          multiplier: number
          updated_at: string
        }
        Insert: {
          city_slug: string
          country_code: string
          display_name: string
          id?: number
          multiplier: number
          updated_at?: string
        }
        Update: {
          city_slug?: string
          country_code?: string
          display_name?: string
          id?: number
          multiplier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_pricing_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries_pricing"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "cities_pricing_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "earnings_country_rates"
            referencedColumns: ["country_code"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          booking_id: string | null
          commission_amount: number | null
          created_at: string | null
          id: string
        }
        Insert: {
          booking_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          id?: string
        }
        Update: {
          booking_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          id: number
          pct: number
          scope: string
          updated_at: string
        }
        Insert: {
          id?: number
          pct: number
          scope: string
          updated_at?: string
        }
        Update: {
          id?: number
          pct?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      complexity_adjustments: {
        Row: {
          factor_slug: string
          id: number
          pct: number
          updated_at: string
        }
        Insert: {
          factor_slug: string
          id?: number
          pct: number
          updated_at?: string
        }
        Update: {
          factor_slug?: string
          id?: number
          pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      compliance_disclosures: {
        Row: {
          body: string
          id: number
          scope: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: number
          scope: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: number
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      countries_pricing: {
        Row: {
          base_hourly: number
          country_code: string
          currency: string
          id: number
          per_km: number
          symbol: string
          updated_at: string
        }
        Insert: {
          base_hourly: number
          country_code: string
          currency: string
          id?: number
          per_km: number
          symbol: string
          updated_at?: string
        }
        Update: {
          base_hourly?: number
          country_code?: string
          currency?: string
          id?: number
          per_km?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_payment_fallback: {
        Row: {
          country_code: string
          fallback_method: string
          id: number
          updated_at: string
        }
        Insert: {
          country_code: string
          fallback_method: string
          id?: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          fallback_method?: string
          id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_payment_fallback_fallback_method_fkey"
            columns: ["fallback_method"]
            isOneToOne: false
            referencedRelation: "country_payment_picker"
            referencedColumns: ["method_slug"]
          },
          {
            foreignKeyName: "country_payment_fallback_fallback_method_fkey"
            columns: ["fallback_method"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["slug"]
          },
        ]
      }
      country_payment_routing: {
        Row: {
          country_code: string
          gateway_slug: string
          id: number
          position: number
          updated_at: string
        }
        Insert: {
          country_code: string
          gateway_slug: string
          id?: number
          position: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          gateway_slug?: string
          id?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_payment_routing_gateway_slug_fkey"
            columns: ["gateway_slug"]
            isOneToOne: false
            referencedRelation: "country_payment_picker"
            referencedColumns: ["gateway_slug"]
          },
          {
            foreignKeyName: "country_payment_routing_gateway_slug_fkey"
            columns: ["gateway_slug"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["slug"]
          },
        ]
      }
      country_profiles: {
        Row: {
          country_code: string
          currency: string | null
          display_name: string
          flag_emoji: string
          id: number
          market_note: string | null
          service_model: string
          tax_mode: string
          updated_at: string
        }
        Insert: {
          country_code: string
          currency?: string | null
          display_name: string
          flag_emoji: string
          id?: number
          market_note?: string | null
          service_model: string
          tax_mode: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          currency?: string | null
          display_name?: string
          flag_emoji?: string
          id?: number
          market_note?: string | null
          service_model?: string
          tax_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "countries_pricing"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "earnings_country_rates"
            referencedColumns: ["country_code"]
          },
        ]
      }
      country_score_weights: {
        Row: {
          completion_weight: number | null
          country_code: string
          dispute_penalty: number | null
          on_time_weight: number | null
          rating_weight: number | null
          response_weight: number | null
          updated_at: string
          verification_weight: number | null
        }
        Insert: {
          completion_weight?: number | null
          country_code: string
          dispute_penalty?: number | null
          on_time_weight?: number | null
          rating_weight?: number | null
          response_weight?: number | null
          updated_at?: string
          verification_weight?: number | null
        }
        Update: {
          completion_weight?: number | null
          country_code?: string
          dispute_penalty?: number | null
          on_time_weight?: number | null
          rating_weight?: number | null
          response_weight?: number | null
          updated_at?: string
          verification_weight?: number | null
        }
        Relationships: []
      }
      crew_multipliers: {
        Row: {
          crew_size: number
          id: number
          multiplier: number
          updated_at: string
        }
        Insert: {
          crew_size: number
          id?: number
          multiplier: number
          updated_at?: string
        }
        Update: {
          crew_size?: number
          id?: number
          multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      currency_settings: {
        Row: {
          currency: string
          id: number
          locale: string
          symbol: string
          updated_at: string
          usd_rate: number
        }
        Insert: {
          currency: string
          id?: number
          locale?: string
          symbol: string
          updated_at?: string
          usd_rate: number
        }
        Update: {
          currency?: string
          id?: number
          locale?: string
          symbol?: string
          updated_at?: string
          usd_rate?: number
        }
        Relationships: []
      }
      departments: {
        Row: {
          cost_center: string | null
          created_at: string
          id: string
          monthly_budget: number | null
          name: string
          organization_id: string
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name: string
          organization_id: string
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_regions: {
        Row: {
          blurb: string | null
          country_code: string
          display_name: string
          flag: string | null
          is_headquarters: boolean
          lat: number | null
          lng: number | null
          position: number
          region: string
          status: string
          upcoming_rollout: string | null
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          country_code: string
          display_name: string
          flag?: string | null
          is_headquarters?: boolean
          lat?: number | null
          lng?: number | null
          position?: number
          region: string
          status: string
          upcoming_rollout?: string | null
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          country_code?: string
          display_name?: string
          flag?: string | null
          is_headquarters?: boolean
          lat?: number | null
          lng?: number | null
          position?: number
          region?: string
          status?: string
          upcoming_rollout?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_logs: {
        Row: {
          booking_id: string | null
          created_at: string | null
          dispatch_score: number | null
          driver_id: string | null
          id: string
          notification_sent_at: string | null
          response: string | null
          response_time: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          dispatch_score?: number | null
          driver_id?: string | null
          id?: string
          notification_sent_at?: string | null
          response?: string | null
          response_time?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          dispatch_score?: number | null
          driver_id?: string | null
          id?: string
          notification_sent_at?: string | null
          response?: string | null
          response_time?: number | null
        }
        Relationships: []
      }
      dispute_automation_rules: {
        Row: {
          condition_key: string
          description: string | null
          enabled: boolean
          id: number
          slug: string
          suggested_path: string
          suggested_pct: number | null
          threshold: number | null
          updated_at: string
        }
        Insert: {
          condition_key: string
          description?: string | null
          enabled?: boolean
          id?: number
          slug: string
          suggested_path: string
          suggested_pct?: number | null
          threshold?: number | null
          updated_at?: string
        }
        Update: {
          condition_key?: string
          description?: string | null
          enabled?: boolean
          id?: number
          slug?: string
          suggested_path?: string
          suggested_pct?: number | null
          threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dispute_categories: {
        Row: {
          default_path: string
          description: string | null
          id: number
          label: string
          position: number
          severity: number
          slug: string
          updated_at: string
        }
        Insert: {
          default_path: string
          description?: string | null
          id?: number
          label: string
          position?: number
          severity?: number
          slug: string
          updated_at?: string
        }
        Update: {
          default_path?: string
          description?: string | null
          id?: number
          label?: string
          position?: number
          severity?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          file_url: string | null
          id: string
          kind: string
          note: string | null
          uploader_role: string
          uploader_user_id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_url?: string | null
          id?: string
          kind: string
          note?: string | null
          uploader_role: string
          uploader_user_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_url?: string | null
          id?: string
          kind?: string
          note?: string | null
          uploader_role?: string
          uploader_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_resolution_templates: {
        Row: {
          category_slug: string
          country_code: string
          id: number
          note: string | null
          path: string
          suggested_pct: number | null
          updated_at: string
        }
        Insert: {
          category_slug: string
          country_code: string
          id?: number
          note?: string | null
          path: string
          suggested_pct?: number | null
          updated_at?: string
        }
        Update: {
          category_slug?: string
          country_code?: string
          id?: number
          note?: string | null
          path?: string
          suggested_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_resolution_templates_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "dispute_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      dispute_resolutions: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          amount: number | null
          created_at: string
          dispute_id: string
          id: string
          path: string
          pct: number | null
          rationale: string | null
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          dispute_id: string
          id?: string
          path: string
          pct?: number | null
          rationale?: string | null
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          amount?: number | null
          created_at?: string
          dispute_id?: string
          id?: string
          path?: string
          pct?: number | null
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_resolutions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          booking_id: string
          category_slug: string
          country: string
          created_at: string
          customer_user_id: string
          filed_at: string
          final_amount: number | null
          final_path: string | null
          final_pct: number | null
          id: string
          provider_user_id: string | null
          resolved_at: string | null
          review_due_at: string
          status: string
          suggested_path: string | null
          suggested_pct: number | null
          summary: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          category_slug: string
          country: string
          created_at?: string
          customer_user_id: string
          filed_at?: string
          final_amount?: number | null
          final_path?: string | null
          final_pct?: number | null
          id?: string
          provider_user_id?: string | null
          resolved_at?: string | null
          review_due_at?: string
          status?: string
          suggested_path?: string | null
          suggested_pct?: number | null
          summary: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          category_slug?: string
          country?: string
          created_at?: string
          customer_user_id?: string
          filed_at?: string
          final_amount?: number | null
          final_path?: string | null
          final_pct?: number | null
          id?: string
          provider_user_id?: string | null
          resolved_at?: string | null
          review_due_at?: string
          status?: string
          suggested_path?: string | null
          suggested_pct?: number | null
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "dispute_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      driver_applications: {
        Row: {
          address: string | null
          cargo_capacity: number | null
          city: string | null
          created_at: string | null
          documents: Json | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          license_expiry: string | null
          license_number: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
          vehicle_model: string | null
          vehicle_registration: string | null
          vehicle_type: string | null
          vehicle_year: number | null
          years_experience: number | null
          zone: string | null
        }
        Insert: {
          address?: string | null
          cargo_capacity?: number | null
          city?: string | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
          vehicle_model?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          years_experience?: number | null
          zone?: string | null
        }
        Update: {
          address?: string | null
          cargo_capacity?: number | null
          city?: string | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          license_expiry?: string | null
          license_number?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
          vehicle_model?: string | null
          vehicle_registration?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
          years_experience?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          document_type: string | null
          driver_id: string | null
          file_url: string | null
          id: string
          status: string | null
          uploaded_at: string | null
          verification_status: string | null
        }
        Insert: {
          document_type?: string | null
          driver_id?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          uploaded_at?: string | null
          verification_status?: string | null
        }
        Update: {
          document_type?: string | null
          driver_id?: string | null
          file_url?: string | null
          id?: string
          status?: string | null
          uploaded_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string | null
          heading: number | null
          lat: number | null
          lng: number | null
          speed: number | null
          updated_at: string | null
        }
        Insert: {
          driver_id?: string | null
          heading?: number | null
          lat?: number | null
          lng?: number | null
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          driver_id?: string | null
          heading?: number | null
          lat?: number | null
          lng?: number | null
          speed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          acceptance_rate: number | null
          cancellation_rate: number | null
          city: string | null
          completed_deliveries: number | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          license_plate: string | null
          online: boolean | null
          phone: string | null
          rating: number | null
          status: string | null
          subscription_active: boolean | null
          subscription_plan: string | null
          tier: string | null
          total_jobs: number | null
          trust_score: number | null
          user_id: string | null
          van_size: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          completed_deliveries?: number | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          license_plate?: string | null
          online?: boolean | null
          phone?: string | null
          rating?: number | null
          status?: string | null
          subscription_active?: boolean | null
          subscription_plan?: string | null
          tier?: string | null
          total_jobs?: number | null
          trust_score?: number | null
          user_id?: string | null
          van_size?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          completed_deliveries?: number | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          license_plate?: string | null
          online?: boolean | null
          phone?: string | null
          rating?: number | null
          status?: string | null
          subscription_active?: boolean | null
          subscription_plan?: string | null
          tier?: string | null
          total_jobs?: number | null
          trust_score?: number | null
          user_id?: string | null
          van_size?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      driver_subscriptions: {
        Row: {
          amount_paid_nok: number | null
          created_at: string | null
          driver_id: string | null
          end_date: string | null
          id: string
          payment_method: string | null
          pending_plan: string | null
          plan: string | null
          plan_id: string | null
          proration_credit: number | null
          start_date: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          vat_nok: number | null
        }
        Insert: {
          amount_paid_nok?: number | null
          created_at?: string | null
          driver_id?: string | null
          end_date?: string | null
          id?: string
          payment_method?: string | null
          pending_plan?: string | null
          plan?: string | null
          plan_id?: string | null
          proration_credit?: number | null
          start_date?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          vat_nok?: number | null
        }
        Update: {
          amount_paid_nok?: number | null
          created_at?: string | null
          driver_id?: string | null
          end_date?: string | null
          id?: string
          payment_method?: string | null
          pending_plan?: string | null
          plan?: string | null
          plan_id?: string | null
          proration_credit?: number | null
          start_date?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          vat_nok?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["tier_slug"]
          },
          {
            foreignKeyName: "driver_subscriptions_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "driver_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallet_transactions: {
        Row: {
          amount: number | null
          booking_id: string | null
          created_at: string | null
          description: string | null
          driver_id: string | null
          id: string
          type: string | null
        }
        Insert: {
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string | null
          id?: string
          type?: string | null
        }
        Relationships: []
      }
      driver_wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          driver_id: string | null
          id: string
          pending: number | null
          pending_payout: number | null
          total_earned: number | null
          total_withdrawn: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          pending?: number | null
          pending_payout?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          pending?: number | null
          pending_payout?: number | null
          total_earned?: number | null
          total_withdrawn?: number | null
        }
        Relationships: []
      }
      drivers: {
        Row: {
          acceptance_rate: number | null
          cancellation_rate: number | null
          city: string | null
          completed_deliveries: number | null
          created_at: string | null
          default_plan_id: string | null
          id: string
          online: boolean | null
          rating: number | null
          status: string | null
          subscription_active: boolean | null
          subscription_plan: string | null
          subscription_start_date: string | null
          tier: string | null
          trust_score: number | null
          user_id: string | null
          zone: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          completed_deliveries?: number | null
          created_at?: string | null
          default_plan_id?: string | null
          id?: string
          online?: boolean | null
          rating?: number | null
          status?: string | null
          subscription_active?: boolean | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          tier?: string | null
          trust_score?: number | null
          user_id?: string | null
          zone?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          city?: string | null
          completed_deliveries?: number | null
          created_at?: string | null
          default_plan_id?: string | null
          id?: string
          online?: boolean | null
          rating?: number | null
          status?: string | null
          subscription_active?: boolean | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          tier?: string | null
          trust_score?: number | null
          user_id?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      escrow_payments: {
        Row: {
          adjustment_approved: boolean | null
          adjustment_required: boolean | null
          amount: number | null
          booking_id: string | null
          created_at: string | null
          driver_earning: number | null
          id: string
          refund_amount: number | null
          status: string | null
        }
        Insert: {
          adjustment_approved?: boolean | null
          adjustment_required?: boolean | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          driver_earning?: number | null
          id?: string
          refund_amount?: number | null
          status?: string | null
        }
        Update: {
          adjustment_approved?: boolean | null
          adjustment_required?: boolean | null
          amount?: number | null
          booking_id?: string | null
          created_at?: string | null
          driver_earning?: number | null
          id?: string
          refund_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: number
          op: string
          record_id: string
          table_name: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: number
          op: string
          record_id: string
          table_name: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          after_value?: Json | null
          before_value?: Json | null
          created_at?: string
          id?: number
          op?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      finops_accounts: {
        Row: {
          base_currency: string
          country_scope: string | null
          created_at: string
          display_name: string | null
          locale: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency?: string
          country_scope?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency?: string
          country_scope?: string | null
          created_at?: string
          display_name?: string | null
          locale?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          currency: string
          ends_at: string | null
          id: number
          rate_to_usd: number
          source: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          ends_at?: string | null
          id?: number
          rate_to_usd: number
          source?: string | null
          starts_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          ends_at?: string | null
          id?: number
          rate_to_usd?: number
          source?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      gateway_methods: {
        Row: {
          gateway_slug: string
          id: number
          method_slug: string
          position: number
          updated_at: string
        }
        Insert: {
          gateway_slug: string
          id?: number
          method_slug: string
          position?: number
          updated_at?: string
        }
        Update: {
          gateway_slug?: string
          id?: number
          method_slug?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_methods_gateway_slug_fkey"
            columns: ["gateway_slug"]
            isOneToOne: false
            referencedRelation: "country_payment_picker"
            referencedColumns: ["gateway_slug"]
          },
          {
            foreignKeyName: "gateway_methods_gateway_slug_fkey"
            columns: ["gateway_slug"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "gateway_methods_method_slug_fkey"
            columns: ["method_slug"]
            isOneToOne: false
            referencedRelation: "country_payment_picker"
            referencedColumns: ["method_slug"]
          },
          {
            foreignKeyName: "gateway_methods_method_slug_fkey"
            columns: ["method_slug"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["slug"]
          },
        ]
      }
      identity_federation_providers: {
        Row: {
          auth_protocol: string
          country_code: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          issuer_url: string | null
          jwks_url: string | null
          mints_level: number
          notes: string | null
          scope: string
          slug: string
          updated_at: string
        }
        Insert: {
          auth_protocol: string
          country_code?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          issuer_url?: string | null
          jwks_url?: string | null
          mints_level?: number
          notes?: string | null
          scope: string
          slug: string
          updated_at?: string
        }
        Update: {
          auth_protocol?: string
          country_code?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          issuer_url?: string | null
          jwks_url?: string | null
          mints_level?: number
          notes?: string | null
          scope?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          country_code: string | null
          created_at: string
          evidence_url: string | null
          expires_at: string | null
          federated_via: string | null
          id: string
          kind: string
          reference: string | null
          rejection_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          evidence_url?: string | null
          expires_at?: string | null
          federated_via?: string | null
          id?: string
          kind: string
          reference?: string | null
          rejection_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          evidence_url?: string | null
          expires_at?: string | null
          federated_via?: string | null
          id?: string
          kind?: string
          reference?: string | null
          rejection_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance_options: {
        Row: {
          blurb: string | null
          coverage_max: number | null
          id: number
          label: string
          per_hour: number
          tier_slug: string
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          coverage_max?: number | null
          id?: number
          label: string
          per_hour?: number
          tier_slug: string
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          coverage_max?: number | null
          id?: number
          label?: string
          per_hour?: number
          tier_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_rules_by_country: {
        Row: {
          country_code: string
          id: number
          note: string | null
          per_hour_multiplier: number
          position: number
          tier_slug: string
          updated_at: string
        }
        Insert: {
          country_code: string
          id?: number
          note?: string | null
          per_hour_multiplier?: number
          position?: number
          tier_slug: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          id?: number
          note?: string | null
          per_hour_multiplier?: number
          position?: number
          tier_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_profiles"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "tax_modes_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_tier_slug_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "country_insurance_picker"
            referencedColumns: ["tier_slug"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_tier_slug_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "insurance_options"
            referencedColumns: ["tier_slug"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          locale?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string | null
          source?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          kind: string
          link_id: string | null
          link_page: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          kind: string
          link_id?: string | null
          link_page?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          link_id?: string | null
          link_page?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_country_categories: {
        Row: {
          category_slug: string
          country_code: string
          id: number
          position: number
          updated_at: string
        }
        Insert: {
          category_slug: string
          country_code: string
          id?: number
          position?: number
          updated_at?: string
        }
        Update: {
          category_slug?: string
          country_code?: string
          id?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_country_categories_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "provider_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      onboarding_country_fields: {
        Row: {
          condition_on: string | null
          country_code: string
          help_text: string | null
          id: number
          label: string
          position: number
          requirement: string
          slug: string
          updated_at: string
        }
        Insert: {
          condition_on?: string | null
          country_code: string
          help_text?: string | null
          id?: number
          label: string
          position?: number
          requirement: string
          slug: string
          updated_at?: string
        }
        Update: {
          condition_on?: string | null
          country_code?: string
          help_text?: string | null
          id?: number
          label?: string
          position?: number
          requirement?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_universal_fields: {
        Row: {
          help_text: string | null
          id: number
          label: string
          position: number
          requirement: string
          slug: string
          updated_at: string
        }
        Insert: {
          help_text?: string | null
          id?: number
          label: string
          position?: number
          requirement: string
          slug: string
          updated_at?: string
        }
        Update: {
          help_text?: string | null
          id?: number
          label?: string
          position?: number
          requirement?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_contracts: {
        Row: {
          created_at: string
          discount_pct: number | null
          expires_at: string | null
          hourly_cap_usd: number | null
          id: string
          min_provider_tier: string | null
          name: string
          organization_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_pct?: number | null
          expires_at?: string | null
          hourly_cap_usd?: number | null
          id?: string
          min_provider_tier?: string | null
          name: string
          organization_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_pct?: number | null
          expires_at?: string | null
          hourly_cap_usd?: number | null
          id?: string
          min_provider_tier?: string | null
          name?: string
          organization_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          department_id: string | null
          expires_at: string
          id: string
          invited_by_user_id: string
          invited_email: string
          organization_id: string
          revoked_at: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          department_id?: string | null
          expires_at?: string
          id?: string
          invited_by_user_id: string
          invited_email: string
          organization_id: string
          revoked_at?: string | null
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          department_id?: string | null
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          invited_email?: string
          organization_id?: string
          revoked_at?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invoices: {
        Row: {
          created_at: string
          currency: string
          department_breakdown: Json
          due_at: string | null
          external_ref: string | null
          id: string
          organization_id: string
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          department_breakdown?: Json
          due_at?: string | null
          external_ref?: string | null
          id?: string
          organization_id: string
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          department_breakdown?: Json
          due_at?: string | null
          external_ref?: string | null
          id?: string
          organization_id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          department_id: string | null
          id: string
          invited_at: string
          joined_at: string | null
          organization_id: string
          revoked_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          department_id?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          organization_id: string
          revoked_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          department_id?: string | null
          id?: string
          invited_at?: string
          joined_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_department_fk"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_model: string
          country_code: string
          created_at: string
          deleted_at: string | null
          id: string
          legal_name: string | null
          name: string
          primary_contact: string | null
          primary_email: string | null
          primary_phone: string | null
          procurement_verified: boolean
          sector: string
          tax_registration: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          billing_model?: string
          country_code: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          name: string
          primary_contact?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          procurement_verified?: boolean
          sector: string
          tax_registration?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          billing_model?: string
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          primary_contact?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          procurement_verified?: boolean
          sector?: string
          tax_registration?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          blurb: string | null
          id: number
          name: string
          settlement: string
          slug: string
          supports_currencies: string[]
          updated_at: string
        }
        Insert: {
          blurb?: string | null
          id?: number
          name: string
          settlement: string
          slug: string
          supports_currencies: string[]
          updated_at?: string
        }
        Update: {
          blurb?: string | null
          id?: number
          name?: string
          settlement?: string
          slug?: string
          supports_currencies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          category: string
          id: number
          label: string
          slug: string
          updated_at: string
        }
        Insert: {
          category: string
          id?: number
          label: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          id?: number
          label?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number | null
          created_at: string | null
          driver_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          config_key: string | null
          config_value: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          config_key?: string | null
          config_value?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          config_key?: string | null
          config_value?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      platform_roles: {
        Row: {
          description: string | null
          display_name: string
          group_label: string
          min_trust_level: number
          position: number
          slug: string
        }
        Insert: {
          description?: string | null
          display_name: string
          group_label: string
          min_trust_level?: number
          position?: number
          slug: string
        }
        Update: {
          description?: string | null
          display_name?: string
          group_label?: string
          min_trust_level?: number
          position?: number
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          language: string | null
          last_name: string | null
          phone: string | null
          referral_code: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
          referral_code?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          phone?: string | null
          referral_code?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_availability_blackouts: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          reason: string | null
          starts_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          reason?: string | null
          starts_on: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          reason?: string | null
          starts_on?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_categories: {
        Row: {
          default_licensing_required: boolean
          default_vehicle_operation: boolean
          description: string
          icon: string | null
          id: number
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          default_licensing_required?: boolean
          default_vehicle_operation?: boolean
          description: string
          icon?: string | null
          id?: number
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          default_licensing_required?: boolean
          default_vehicle_operation?: boolean
          description?: string
          icon?: string | null
          id?: number
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_compliance_documents: {
        Row: {
          country_code: string
          created_at: string
          document_slug: string
          expires_at: string | null
          file_url: string | null
          id: string
          reference: string | null
          rejection_note: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          document_slug: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          reference?: string | null
          rejection_note?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          document_slug?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          reference?: string | null
          rejection_note?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_pricing: {
        Row: {
          available_crew_sizes: number[]
          created_at: string
          home_city_slug: string | null
          home_lat: number | null
          home_lng: number | null
          hourly_base_override: number | null
          id: string
          packing_available: boolean
          packing_per_hour_override: number | null
          service_radius_km: number
          storage_available: boolean
          truck_available: boolean
          truck_per_hour_override: number | null
          updated_at: string
          user_id: string
          vacation_mode: boolean
          vacation_until: string | null
          weekend_multiplier_override: number | null
        }
        Insert: {
          available_crew_sizes?: number[]
          created_at?: string
          home_city_slug?: string | null
          home_lat?: number | null
          home_lng?: number | null
          hourly_base_override?: number | null
          id?: string
          packing_available?: boolean
          packing_per_hour_override?: number | null
          service_radius_km?: number
          storage_available?: boolean
          truck_available?: boolean
          truck_per_hour_override?: number | null
          updated_at?: string
          user_id: string
          vacation_mode?: boolean
          vacation_until?: string | null
          weekend_multiplier_override?: number | null
        }
        Update: {
          available_crew_sizes?: number[]
          created_at?: string
          home_city_slug?: string | null
          home_lat?: number | null
          home_lng?: number | null
          hourly_base_override?: number | null
          id?: string
          packing_available?: boolean
          packing_per_hour_override?: number | null
          service_radius_km?: number
          storage_available?: boolean
          truck_available?: boolean
          truck_per_hour_override?: number | null
          updated_at?: string
          user_id?: string
          vacation_mode?: boolean
          vacation_until?: string | null
          weekend_multiplier_override?: number | null
        }
        Relationships: []
      }
      provider_quotes: {
        Row: {
          amount_total: number
          created_at: string
          deposit_pct: number
          id: string
          note: string | null
          provider_user_id: string
          request_id: string
          status: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          amount_total: number
          created_at?: string
          deposit_pct?: number
          id?: string
          note?: string | null
          provider_user_id: string
          request_id: string
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Update: {
          amount_total?: number
          created_at?: string
          deposit_pct?: number
          id?: string
          note?: string | null
          provider_user_id?: string
          request_id?: string
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_ratings: {
        Row: {
          booking_id: string
          care_of_items: number | null
          communication: number | null
          created_at: string
          customer_user_id: string
          estimate_accuracy: number | null
          id: string
          overall: number | null
          professionalism: number | null
          provider_user_id: string
          punctuality: number | null
          review_text: string | null
        }
        Insert: {
          booking_id: string
          care_of_items?: number | null
          communication?: number | null
          created_at?: string
          customer_user_id: string
          estimate_accuracy?: number | null
          id?: string
          overall?: number | null
          professionalism?: number | null
          provider_user_id: string
          punctuality?: number | null
          review_text?: string | null
        }
        Update: {
          booking_id?: string
          care_of_items?: number | null
          communication?: number | null
          created_at?: string
          customer_user_id?: string
          estimate_accuracy?: number | null
          id?: string
          overall?: number | null
          professionalism?: number | null
          provider_user_id?: string
          punctuality?: number | null
          review_text?: string | null
        }
        Relationships: []
      }
      provider_reputation: {
        Row: {
          avg_rating: number | null
          completion_rate: number | null
          dispute_count: number
          dispute_loss_count: number
          flagged_at: string | null
          flagged_reason: string | null
          is_suspended: boolean
          is_top_rated: boolean
          last_active_at: string | null
          on_time_rate: number | null
          rank_score: number | null
          rating_count: number
          recent_activity_score: number | null
          refunds_total: number
          reliability_score: number
          response_speed_score: number | null
          service_credits_total: number
          trust_badges: string[]
          updated_at: string
          user_id: string
          verification_level: number
          warning_count_30d: number
        }
        Insert: {
          avg_rating?: number | null
          completion_rate?: number | null
          dispute_count?: number
          dispute_loss_count?: number
          flagged_at?: string | null
          flagged_reason?: string | null
          is_suspended?: boolean
          is_top_rated?: boolean
          last_active_at?: string | null
          on_time_rate?: number | null
          rank_score?: number | null
          rating_count?: number
          recent_activity_score?: number | null
          refunds_total?: number
          reliability_score?: number
          response_speed_score?: number | null
          service_credits_total?: number
          trust_badges?: string[]
          updated_at?: string
          user_id: string
          verification_level?: number
          warning_count_30d?: number
        }
        Update: {
          avg_rating?: number | null
          completion_rate?: number | null
          dispute_count?: number
          dispute_loss_count?: number
          flagged_at?: string | null
          flagged_reason?: string | null
          is_suspended?: boolean
          is_top_rated?: boolean
          last_active_at?: string | null
          on_time_rate?: number | null
          rank_score?: number | null
          rating_count?: number
          recent_activity_score?: number | null
          refunds_total?: number
          reliability_score?: number
          response_speed_score?: number | null
          service_credits_total?: number
          trust_badges?: string[]
          updated_at?: string
          user_id?: string
          verification_level?: number
          warning_count_30d?: number
        }
        Relationships: []
      }
      provider_specializations: {
        Row: {
          created_at: string
          id: string
          proficiency: number
          tag: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency?: number
          tag: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proficiency?: number
          tag?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_warnings: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          resolved_at: string | null
          rule_slug: string
          severity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          resolved_at?: string | null
          rule_slug: string
          severity: number
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          resolved_at?: string | null
          rule_slug?: string
          severity?: number
          user_id?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          accepted_quote_id: string | null
          brief: Json
          category: string
          country: string
          created_at: string
          dropoff_address: string
          dropoff_city: string | null
          expires_at: string
          id: string
          move_date: string | null
          pickup_address: string
          pickup_city: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_quote_id?: string | null
          brief?: Json
          category: string
          country: string
          created_at?: string
          dropoff_address: string
          dropoff_city?: string | null
          expires_at?: string
          id?: string
          move_date?: string | null
          pickup_address: string
          pickup_city?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_quote_id?: string | null
          brief?: Json
          category?: string
          country?: string
          created_at?: string
          dropoff_address?: string
          dropoff_city?: string | null
          expires_at?: string
          id?: string
          move_date?: string | null
          pickup_address?: string
          pickup_city?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relocation_request_approvals: {
        Row: {
          action: string
          actor_user_id: string
          comment: string | null
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relocation_request_approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "relocation_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      relocation_requests: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          brief: Json
          city: string | null
          contract_id: string | null
          country: string
          created_at: string
          department_id: string | null
          dispatched_booking_id: string | null
          estimated_total: number | null
          id: string
          organization_id: string
          requested_by_user_id: string
          segment: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          brief?: Json
          city?: string | null
          contract_id?: string | null
          country: string
          created_at?: string
          department_id?: string | null
          dispatched_booking_id?: string | null
          estimated_total?: number | null
          id?: string
          organization_id: string
          requested_by_user_id: string
          segment: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          brief?: Json
          city?: string | null
          contract_id?: string | null
          country?: string
          created_at?: string
          department_id?: string | null
          dispatched_booking_id?: string | null
          estimated_total?: number | null
          id?: string
          organization_id?: string
          requested_by_user_id?: string
          segment?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relocation_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "organization_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relocation_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relocation_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfp_submissions: {
        Row: {
          assigned_to_user_id: string | null
          budget_range_usd: string | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          country: string
          created_at: string
          deployment_type: string
          document_url: string | null
          id: string
          notes: string | null
          notify_sent_at: string | null
          organization_name: string
          sector: string
          status: string
          submitted_by_user_id: string | null
          timeline: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          budget_range_usd?: string | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          country: string
          created_at?: string
          deployment_type: string
          document_url?: string | null
          id?: string
          notes?: string | null
          notify_sent_at?: string | null
          organization_name: string
          sector: string
          status?: string
          submitted_by_user_id?: string | null
          timeline: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          budget_range_usd?: string | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          country?: string
          created_at?: string
          deployment_type?: string
          document_url?: string | null
          id?: string
          notes?: string | null
          notify_sent_at?: string | null
          organization_name?: string
          sector?: string
          status?: string
          submitted_by_user_id?: string | null
          timeline?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasonal_adjustments: {
        Row: {
          factor_slug: string
          id: number
          pct: number
          updated_at: string
        }
        Insert: {
          factor_slug: string
          id?: number
          pct: number
          updated_at?: string
        }
        Update: {
          factor_slug?: string
          id?: number
          pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      seasonal_adjustments_by_country: {
        Row: {
          country_code: string
          factor_slug: string
          id: number
          pct_override: number | null
          updated_at: string
        }
        Insert: {
          country_code: string
          factor_slug: string
          id?: number
          pct_override?: number | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          factor_slug?: string
          id?: number
          pct_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_adjustments_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_profiles"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "seasonal_adjustments_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "seasonal_adjustments_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "tax_modes_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "seasonal_adjustments_by_country_factor_slug_fkey"
            columns: ["factor_slug"]
            isOneToOne: false
            referencedRelation: "availability_adjustments"
            referencedColumns: ["factor_slug"]
          },
          {
            foreignKeyName: "seasonal_adjustments_by_country_factor_slug_fkey"
            columns: ["factor_slug"]
            isOneToOne: false
            referencedRelation: "seasonal_adjustments"
            referencedColumns: ["factor_slug"]
          },
        ]
      }
      service_type_adjustments: {
        Row: {
          additive_per_hour: number
          id: number
          label: string
          multiplier: number
          service_slug: string
          updated_at: string
        }
        Insert: {
          additive_per_hour?: number
          id?: number
          label: string
          multiplier?: number
          service_slug: string
          updated_at?: string
        }
        Update: {
          additive_per_hour?: number
          id?: number
          label?: string
          multiplier?: number
          service_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_types_by_country: {
        Row: {
          country_code: string
          id: number
          position: number
          service_slug: string
          updated_at: string
        }
        Insert: {
          country_code: string
          id?: number
          position?: number
          service_slug: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          id?: number
          position?: number
          service_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_profiles"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "service_types_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "service_types_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "tax_modes_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "service_types_by_country_service_slug_fkey"
            columns: ["service_slug"]
            isOneToOne: false
            referencedRelation: "service_bonus_rates"
            referencedColumns: ["service_slug"]
          },
          {
            foreignKeyName: "service_types_by_country_service_slug_fkey"
            columns: ["service_slug"]
            isOneToOne: false
            referencedRelation: "service_type_adjustments"
            referencedColumns: ["service_slug"]
          },
        ]
      }
      subscription_country_multipliers: {
        Row: {
          country_code: string
          multiplier: number
          updated_at: string
        }
        Insert: {
          country_code: string
          multiplier: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          driver_id: string | null
          id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          driver_id?: string | null
          id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          base_commission: Json | null
          billing_period: string | null
          created_at: string | null
          dispatch_priority: number | null
          dispatch_weight: number | null
          features: Json | null
          id: string
          job_visibility: string | null
          max_job_value: number | null
          name: string | null
          price: number | null
        }
        Insert: {
          base_commission?: Json | null
          billing_period?: string | null
          created_at?: string | null
          dispatch_priority?: number | null
          dispatch_weight?: number | null
          features?: Json | null
          id?: string
          job_visibility?: string | null
          max_job_value?: number | null
          name?: string | null
          price?: number | null
        }
        Update: {
          base_commission?: Json | null
          billing_period?: string | null
          created_at?: string | null
          dispatch_priority?: number | null
          dispatch_weight?: number | null
          features?: Json | null
          id?: string
          job_visibility?: string | null
          max_job_value?: number | null
          name?: string | null
          price?: number | null
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          baseline_usd: number
          commission_pct: number
          display_name: string
          popular: boolean
          position: number
          privileges: string[]
          short_name: string
          slug: string
          tagline: string | null
          trust_badge: string | null
          updated_at: string
        }
        Insert: {
          baseline_usd: number
          commission_pct: number
          display_name: string
          popular?: boolean
          position: number
          privileges?: string[]
          short_name: string
          slug: string
          tagline?: string | null
          trust_badge?: string | null
          updated_at?: string
        }
        Update: {
          baseline_usd?: number
          commission_pct?: number
          display_name?: string
          popular?: boolean
          position?: number
          privileges?: string[]
          short_name?: string
          slug?: string
          tagline?: string | null
          trust_badge?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tax_mode_by_country: {
        Row: {
          country_code: string
          default_rate: number | null
          display_label: string | null
          notes: string | null
          tax_mode: string
          updated_at: string
        }
        Insert: {
          country_code: string
          default_rate?: number | null
          display_label?: string | null
          notes?: string | null
          tax_mode: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          default_rate?: number | null
          display_label?: string | null
          notes?: string | null
          tax_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      availability_adjustments: {
        Row: {
          factor_slug: string | null
          pct: number | null
          updated_at: string | null
        }
        Insert: {
          factor_slug?: string | null
          pct?: number | null
          updated_at?: string | null
        }
        Update: {
          factor_slug?: string | null
          pct?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      country_identity_requirements: {
        Row: {
          condition_on: string | null
          country_code: string | null
          help_text: string | null
          label: string | null
          position: number | null
          requirement: string | null
          requirement_slug: string | null
        }
        Insert: {
          condition_on?: string | null
          country_code?: string | null
          help_text?: string | null
          label?: string | null
          position?: number | null
          requirement?: string | null
          requirement_slug?: string | null
        }
        Update: {
          condition_on?: string | null
          country_code?: string | null
          help_text?: string | null
          label?: string | null
          position?: number | null
          requirement?: string | null
          requirement_slug?: string | null
        }
        Relationships: []
      }
      country_insurance_picker: {
        Row: {
          blurb: string | null
          country_code: string | null
          country_note: string | null
          coverage_max: number | null
          effective_per_hour: number | null
          label: string | null
          position: number | null
          tier_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "country_profiles"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "insurance_rules_by_country_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "tax_modes_by_country"
            referencedColumns: ["country_code"]
          },
        ]
      }
      country_payment_picker: {
        Row: {
          country_code: string | null
          gateway_name: string | null
          gateway_rank: number | null
          gateway_slug: string | null
          method_category: string | null
          method_label: string | null
          method_position: number | null
          method_slug: string | null
          settlement: string | null
        }
        Relationships: []
      }
      crew_size_multipliers: {
        Row: {
          crew_size: number | null
          multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          crew_size?: number | null
          multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          crew_size?: number | null
          multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      earnings_city_rates: {
        Row: {
          city_slug: string | null
          country_code: string | null
          display_name: string | null
          multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          city_slug?: string | null
          country_code?: string | null
          display_name?: string | null
          multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          city_slug?: string | null
          country_code?: string | null
          display_name?: string | null
          multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_pricing_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries_pricing"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "cities_pricing_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "earnings_country_rates"
            referencedColumns: ["country_code"]
          },
        ]
      }
      earnings_country_rates: {
        Row: {
          country_code: string | null
          currency: string | null
          hourly_rate: number | null
          per_km: number | null
          symbol: string | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          currency?: string | null
          hourly_rate?: number | null
          per_km?: number | null
          symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          currency?: string | null
          hourly_rate?: number | null
          per_km?: number | null
          symbol?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_city_rankings: {
        Row: {
          avg_rating: number | null
          city_rank: number | null
          city_slug: string | null
          completion_rate: number | null
          is_suspended: boolean | null
          is_top_rated: boolean | null
          on_time_rate: number | null
          rank_score: number | null
          rating_count: number | null
          trust_badges: string[] | null
          user_id: string | null
          verification_level: number | null
        }
        Relationships: []
      }
      provider_enterprise_rankings: {
        Row: {
          avg_rating: number | null
          completion_rate: number | null
          is_certified_infrastructure_partner: boolean | null
          is_suspended: boolean | null
          is_top_rated: boolean | null
          on_time_rate: number | null
          rank_score: number | null
          rating_count: number | null
          tier_name: string | null
          tier_position: number | null
          tier_privileges: string[] | null
          tier_slug: string | null
          trust_badges: string[] | null
          user_id: string | null
          verification_level: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_plan_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "subscription_tier_pricing_by_country"
            referencedColumns: ["tier_slug"]
          },
          {
            foreignKeyName: "driver_subscriptions_plan_fkey"
            columns: ["tier_slug"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["slug"]
          },
        ]
      }
      service_bonus_rates: {
        Row: {
          bonus_per_hour: number | null
          label: string | null
          service_slug: string | null
          updated_at: string | null
        }
        Insert: {
          bonus_per_hour?: number | null
          label?: string | null
          service_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus_per_hour?: number | null
          label?: string | null
          service_slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_tier_pricing_by_country: {
        Row: {
          baseline_usd: number | null
          commission_pct: number | null
          country_code: string | null
          country_multiplier: number | null
          country_name: string | null
          currency: string | null
          display_name: string | null
          local_price: number | null
          locale: string | null
          popular: boolean | null
          position: number | null
          privileges: string[] | null
          short_name: string | null
          symbol: string | null
          tagline: string | null
          tier_slug: string | null
          trust_badge: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "countries_pricing"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "earnings_country_rates"
            referencedColumns: ["country_code"]
          },
        ]
      }
      tax_modes_by_country: {
        Row: {
          country_code: string | null
          display_label: string | null
          tax_mode: string | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          display_label?: never
          tax_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          display_label?: never
          tax_mode?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "countries_pricing"
            referencedColumns: ["country_code"]
          },
          {
            foreignKeyName: "country_profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: true
            referencedRelation: "earnings_country_rates"
            referencedColumns: ["country_code"]
          },
        ]
      }
      unified_ledger: {
        Row: {
          amount_original: number | null
          booking_id: string | null
          country_code: string | null
          currency: string | null
          customer_user_id: string | null
          kind: string | null
          occurred_at: string | null
          provider_user_id: string | null
          reference_id: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_org_invite: { Args: { p_token: string }; Returns: string }
      accept_provider_quote: { Args: { p_quote_id: string }; Returns: string }
      admin_escalate_dispute: {
        Args: { p_dispute_id: string; p_rationale: string }
        Returns: undefined
      }
      admin_release_payout: {
        Args: { p_dispute_id: string; p_rationale: string }
        Returns: undefined
      }
      admin_request_evidence: {
        Args: { p_dispute_id: string; p_rationale: string }
        Returns: undefined
      }
      admin_resolve_dispute: {
        Args: {
          p_amount: number
          p_dispute_id: string
          p_path: string
          p_pct: number
          p_rationale: string
        }
        Returns: undefined
      }
      admin_set_provider_suspension: {
        Args: { p_reason: string; p_suspended: boolean; p_user_id: string }
        Returns: undefined
      }
      auto_downgrade_expired_subscriptions: {
        Args: never
        Returns: {
          downgraded_count: number
        }[]
      }
      change_driver_subscription: {
        Args: { p_driver_id: string; p_new_plan: string }
        Returns: undefined
      }
      compute_provider_rank_score: {
        Args: { p_country?: string; p_user_id: string }
        Returns: number
      }
      compute_recent_activity_score: {
        Args: { p_last_active: string }
        Returns: number
      }
      compute_trust_level: { Args: { p_user_id: string }; Returns: number }
      create_org_invite: {
        Args: {
          p_dept_id?: string
          p_email: string
          p_org_id: string
          p_role: string
        }
        Returns: string
      }
      decrement_driver_wallet: {
        Args: { p_amount: number; p_driver_id: string }
        Returns: undefined
      }
      delete_user_account: { Args: { p_user_id?: string }; Returns: undefined }
      dispatch_assign_best_driver: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      dispatch_rank_candidates: {
        Args: { p_booking_id: string }
        Returns: {
          acceptance_rate: number
          active_jobs: number
          cancellation_rate: number
          dispatch_priority: number
          distance_km: number
          driver_id: string
          driver_user_id: string
          full_name: string
          plan_name: string
          rating: number
          same_city: boolean
          score: number
          trust_score: number
        }[]
      }
      dispatch_relocation_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      expire_identity_verifications: { Args: never; Returns: number }
      expire_provider_compliance_documents: { Args: never; Returns: number }
      export_user_data: { Args: { p_user_id?: string }; Returns: Json }
      file_dispute: {
        Args: {
          p_booking_id: string
          p_category: string
          p_country: string
          p_provider_user?: string
          p_summary: string
        }
        Returns: string
      }
      find_eligible_providers_for_segment: {
        Args: { p_limit?: number; p_segment: string }
        Returns: {
          is_cip: boolean
          rank_score: number
          tier_name: string
          tier_slug: string
          user_id: string
        }[]
      }
      finops_audit_log: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_record?: string
          p_table?: string
        }
        Returns: {
          actor_id: string | null
          actor_role: string | null
          after_value: Json | null
          before_value: Json | null
          created_at: string
          id: number
          op: string
          record_id: string
          table_name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "financial_audit_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      finops_currency_breakdown: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          currency: string
          gross_original: number
          gross_usd: number
          transaction_count: number
        }[]
      }
      finops_ledger: {
        Args: {
          p_country?: string
          p_currency?: string
          p_from?: string
          p_kind?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
        }
        Returns: {
          amount_original: number
          amount_usd: number
          booking_id: string
          country_code: string
          currency: string
          customer_user_id: string
          fx_rate_to_usd: number
          kind: string
          occurred_at: string
          provider_user_id: string
          reference_id: string
          status: string
        }[]
      }
      finops_overview: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      finops_role: { Args: never; Returns: string }
      finops_subscription_revenue: {
        Args: never
        Returns: {
          active_count: number
          display_name: string
          monthly_usd: number
          tier_slug: string
        }[]
      }
      fx_rate_at: {
        Args: { p_at?: string; p_currency: string }
        Returns: number
      }
      haversine_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      increment_driver_wallet: {
        Args: { p_amount: number; p_driver_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_finops: { Args: never; Returns: boolean }
      is_finops_writer: { Args: never; Returns: boolean }
      is_org_member: {
        Args: { p_org: string; p_role?: string }
        Returns: boolean
      }
      live_ops_by_country: {
        Args: never
        Returns: {
          active_jobs: number
          country_code: string
          display_name: string
          enterprise_pending: number
          flag: string
          open_disputes: number
          pending_bookings: number
          providers_onboarding: number
          region: string
          status: string
        }[]
      }
      live_ops_overview: { Args: never; Returns: Json }
      live_ops_provider_availability: {
        Args: { p_country?: string }
        Returns: {
          bucket: string
          packing_count: number
          provider_count: number
          storage_count: number
          truck_count: number
          vacation_count: number
        }[]
      }
      live_ops_revenue: { Args: { p_period?: string }; Returns: Json }
      match_enterprise_min_trust_level: { Args: never; Returns: number }
      match_providers_for_booking: {
        Args: { p_input: Json; p_mode?: string }
        Returns: {
          distance_km: number
          is_cip: boolean
          is_top_rated: boolean
          match_score: number
          rank_score: number
          reasons: string[]
          tier_position: number
          tier_slug: string
          user_id: string
        }[]
      }
      meets_trust_level: {
        Args: { p_min: number; p_user_id: string }
        Returns: boolean
      }
      provider_compliance_status: {
        Args: { p_country: string; p_user_id: string }
        Returns: {
          expired_required: string[]
          is_compliant: boolean
          missing_required: string[]
          rejected_required: string[]
        }[]
      }
      reclaim_stale_dispatches: {
        Args: { p_timeout_minutes?: number }
        Returns: number
      }
      refresh_provider_reputation: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      refresh_provider_scoring: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      run_monthly_org_invoices: {
        Args: { p_period_start: string }
        Returns: number
      }
      run_provider_inactivity_sweep: { Args: never; Returns: number }
      run_provider_warning_check: {
        Args: { p_user_id: string }
        Returns: number
      }
      touch_provider_activity: {
        Args: { p_user_id: string }
        Returns: undefined
      }
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
A new version of Supabase CLI is available: v2.95.4 (currently installed v2.90.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
