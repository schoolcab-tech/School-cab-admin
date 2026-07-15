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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_id: number
          action_type: string
          admin_user_id: string | null
          amount: number | null
          created_at: string | null
          cycle_id: number | null
          notes: string | null
          reason: string | null
        }
        Insert: {
          action_id?: number
          action_type: string
          admin_user_id?: string | null
          amount?: number | null
          created_at?: string | null
          cycle_id?: number | null
          notes?: string | null
          reason?: string | null
        }
        Update: {
          action_id?: number
          action_type?: string
          admin_user_id?: string | null
          amount?: number | null
          created_at?: string | null
          cycle_id?: number | null
          notes?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycles"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          admin_role: Database["public"]["Enums"]["app_role"]
          admin_user_id: string
          created_at: string | null
          entity_id: number | null
          entity_type: string
          ip_address: unknown
          log_id: number
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_role: Database["public"]["Enums"]["app_role"]
          admin_user_id: string
          created_at?: string | null
          entity_id?: number | null
          entity_type: string
          ip_address?: unknown
          log_id?: number
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_role?: Database["public"]["Enums"]["app_role"]
          admin_user_id?: string
          created_at?: string | null
          entity_id?: number | null
          entity_type?: string
          ip_address?: unknown
          log_id?: number
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      benefits: {
        Row: {
          created_at: string | null
          description: string
          display_order: number | null
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          title: string
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          description: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          user_type?: string
        }
        Update: {
          created_at?: string | null
          description?: string
          display_order?: number | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string
          lock_status: Json | null
          notes: string | null
          request_id: number
          requested_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          student_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          lock_status?: Json | null
          notes?: string | null
          request_id?: number
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          lock_status?: Json | null
          notes?: string | null
          request_id?: number
          requested_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_id: number
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at: string
          driver_id: number
          drop_address: string
          drop_pincode: string
          drop_time: string
          duration_days: number | null
          duration_end_date: string | null
          duration_start_date: string | null
          fare: number
          last_cycle_end_date: string | null
          pickup_address: string
          pickup_pincode: string
          pickup_time: string
          school_id: number
          status: Database["public"]["Enums"]["booking_status"]
          student_id: number
          subscription_model: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          booking_id?: number
          booking_type: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          driver_id: number
          drop_address: string
          drop_pincode: string
          drop_time: string
          duration_days?: number | null
          duration_end_date?: string | null
          duration_start_date?: string | null
          fare: number
          last_cycle_end_date?: string | null
          pickup_address: string
          pickup_pincode: string
          pickup_time: string
          school_id: number
          status?: Database["public"]["Enums"]["booking_status"]
          student_id: number
          subscription_model?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          booking_id?: number
          booking_type?: Database["public"]["Enums"]["booking_type"]
          created_at?: string
          driver_id?: number
          drop_address?: string
          drop_pincode?: string
          drop_time?: string
          duration_days?: number | null
          duration_end_date?: string | null
          duration_start_date?: string | null
          fare?: number
          last_cycle_end_date?: string | null
          pickup_address?: string
          pickup_pincode?: string
          pickup_time?: string
          school_id?: number
          status?: Database["public"]["Enums"]["booking_status"]
          student_id?: number
          subscription_model?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "bookings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          applicable_months: number
          code: string
          coupon_id: number
          created_at: string
          created_by_admin: string | null
          description: string | null
          discount_type: string
          discount_value: number
          is_active: boolean
          max_uses: number | null
          name: string
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_months: number
          code: string
          coupon_id?: number
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          discount_type?: string
          discount_value: number
          is_active?: boolean
          max_uses?: number | null
          name: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_months?: number
          code?: string
          coupon_id?: number
          created_at?: string
          created_by_admin?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          is_active?: boolean
          max_uses?: number | null
          name?: string
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      coupon_usage_logs: {
        Row: {
          app_version: string | null
          booking_id: number | null
          coupon_code: string
          coupon_id: number
          created_at: string
          cycle_id: number | null
          device_info: Json | null
          discount_amount: number
          discount_type: string
          discount_value: number
          final_amount: number
          ip_address: unknown
          original_amount: number
          payment_id: number | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          subscription_months: number
          updated_at: string
          usage_id: number
          used_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          app_version?: string | null
          booking_id?: number | null
          coupon_code: string
          coupon_id: number
          created_at?: string
          cycle_id?: number | null
          device_info?: Json | null
          discount_amount: number
          discount_type: string
          discount_value: number
          final_amount: number
          ip_address?: unknown
          original_amount: number
          payment_id?: number | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          subscription_months: number
          updated_at?: string
          usage_id?: number
          used_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          app_version?: string | null
          booking_id?: number | null
          coupon_code?: string
          coupon_id?: number
          created_at?: string
          cycle_id?: number | null
          device_info?: Json | null
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          final_amount?: number
          ip_address?: unknown
          original_amount?: number
          payment_id?: number | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          subscription_months?: number
          updated_at?: string
          usage_id?: number
          used_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "coupon_usage_logs_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["coupon_id"]
          },
          {
            foreignKeyName: "coupon_usage_logs_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycles"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "coupon_usage_logs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["subscription_payment_id"]
          },
        ]
      }
      custom_otp_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          is_signup: boolean
          phone_number: string
          session_id: string
          user_data: Json | null
          user_role: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          is_signup?: boolean
          phone_number: string
          session_id: string
          user_data?: Json | null
          user_role?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          is_signup?: boolean
          phone_number?: string
          session_id?: string
          user_data?: Json | null
          user_role?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          created_at: string | null
          discount_type: string | null
          discount_value: number
          is_active: boolean | null
          min_months: number
          priority: number | null
          rule_description: string | null
          rule_id: number
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_type?: string | null
          discount_value: number
          is_active?: boolean | null
          min_months: number
          priority?: number | null
          rule_description?: string | null
          rule_id?: number
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number
          is_active?: boolean | null
          min_months?: number
          priority?: number | null
          rule_description?: string | null
          rule_id?: number
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          created_at: string | null
          driver_id: number
          heading: number | null
          is_tracking_enabled: boolean | null
          last_seen_at: string | null
          latitude: number
          location_id: number
          longitude: number
          speed: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          driver_id: number
          heading?: number | null
          is_tracking_enabled?: boolean | null
          last_seen_at?: string | null
          latitude: number
          location_id?: number
          longitude: number
          speed?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          created_at?: string | null
          driver_id?: number
          heading?: number | null
          is_tracking_enabled?: boolean | null
          last_seen_at?: string | null
          latitude?: number
          location_id?: number
          longitude?: number
          speed?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      driver_quotations: {
        Row: {
          created_at: string
          driver_id: number
          quotation_id: number
          quoted_price: number
          request_id: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: number
          quotation_id?: number
          quoted_price: number
          request_id: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: number
          quotation_id?: number
          quoted_price?: number
          request_id?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_quotations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["request_id"]
          },
        ]
      }
      driver_rejections: {
        Row: {
          created_at: string | null
          driver_id: number
          reason: string | null
          rejected_at: string | null
          rejection_id: number
          request_id: number
        }
        Insert: {
          created_at?: string | null
          driver_id: number
          reason?: string | null
          rejected_at?: string | null
          rejection_id?: number
          request_id: number
        }
        Update: {
          created_at?: string | null
          driver_id?: number
          reason?: string | null
          rejected_at?: string | null
          rejection_id?: number
          request_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_rejections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_rejections_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["request_id"]
          },
        ]
      }
      driver_service_areas: {
        Row: {
          created_at: string
          driver_id: number
          pincode: string
          service_area_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: number
          pincode: string
          service_area_id?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: number
          pincode?: string
          service_area_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_service_areas_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      driver_withdrawals: {
        Row: {
          amount: number
          created_at: string
          driver_id: number
          notes: string | null
          processed_date: string | null
          request_date: string
          school_id: number | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id: string | null
          updated_at: string
          withdrawal_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id: number
          notes?: string | null
          processed_date?: string | null
          request_date?: string
          school_id?: number | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
          withdrawal_id?: number
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: number
          notes?: string | null
          processed_date?: string | null
          request_date?: string
          school_id?: number | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
          withdrawal_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_withdrawals_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      drivers: {
        Row: {
          avg_rating: number | null
          cab_capacity: number
          cab_number: string
          created_at: string
          driver_id: number
          is_verified: boolean | null
          license_number: string
          name: string | null
          notification_token: string | null
          num_cabs_owned: number | null
          phone: string | null
          schools_serving: number[] | null
          updated_at: string
          user_id: string
          vehicle_type: string
          verification_date: string | null
        }
        Insert: {
          avg_rating?: number | null
          cab_capacity: number
          cab_number: string
          created_at?: string
          driver_id?: number
          is_verified?: boolean | null
          license_number: string
          name?: string | null
          notification_token?: string | null
          num_cabs_owned?: number | null
          phone?: string | null
          schools_serving?: number[] | null
          updated_at?: string
          user_id: string
          vehicle_type: string
          verification_date?: string | null
        }
        Update: {
          avg_rating?: number | null
          cab_capacity?: number
          cab_number?: string
          created_at?: string
          driver_id?: number
          is_verified?: boolean | null
          license_number?: string
          name?: string | null
          notification_token?: string | null
          num_cabs_owned?: number | null
          phone?: string | null
          schools_serving?: number[] | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      escalation_settings: {
        Row: {
          auto_suspend_days: number | null
          created_at: string | null
          escalation_threshold_days: number | null
          is_active: boolean | null
          reminder_frequency_hours: number | null
          school_id: number | null
          setting_id: number
          updated_at: string | null
        }
        Insert: {
          auto_suspend_days?: number | null
          created_at?: string | null
          escalation_threshold_days?: number | null
          is_active?: boolean | null
          reminder_frequency_hours?: number | null
          school_id?: number | null
          setting_id?: number
          updated_at?: string | null
        }
        Update: {
          auto_suspend_days?: number | null
          created_at?: string | null
          escalation_threshold_days?: number | null
          is_active?: boolean | null
          reminder_frequency_hours?: number | null
          school_id?: number | null
          setting_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
        ]
      }
      fleet_cab_mappings: {
        Row: {
          assigned_at: string | null
          assigned_by: string
          created_at: string | null
          driver_id: number
          is_active: boolean | null
          mapping_id: number
          notes: string | null
          owner_id: number
          unassigned_at: string | null
          unassigned_by: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by: string
          created_at?: string | null
          driver_id: number
          is_active?: boolean | null
          mapping_id?: number
          notes?: string | null
          owner_id: number
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string
          created_at?: string | null
          driver_id?: number
          is_active?: boolean | null
          mapping_id?: number
          notes?: string | null
          owner_id?: number
          unassigned_at?: string | null
          unassigned_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_cab_mappings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_cab_mappings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "fleet_owners"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      fleet_owners: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          contact_person: string
          created_at: string | null
          email: string
          gst_number: string | null
          is_active: boolean | null
          owner_id: number
          pan_number: string | null
          phone: string
          pincode: string | null
          state: string | null
          total_cabs_assigned: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          contact_person: string
          created_at?: string | null
          email: string
          gst_number?: string | null
          is_active?: boolean | null
          owner_id?: number
          pan_number?: string | null
          phone: string
          pincode?: string | null
          state?: string | null
          total_cabs_assigned?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string | null
          email?: string
          gst_number?: string | null
          is_active?: boolean | null
          owner_id?: number
          pan_number?: string | null
          phone?: string
          pincode?: string | null
          state?: string | null
          total_cabs_assigned?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      journeys: {
        Row: {
          created_at: string
          driver_id: number
          end_time: string
          journey_date: string
          journey_id: number
          school_id: number
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: number
          end_time: string
          journey_date: string
          journey_id?: number
          school_id: number
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: number
          end_time?: string
          journey_date?: string
          journey_id?: number
          school_id?: number
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journeys_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "journeys_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          is_read: boolean | null
          message: string
          notification_id: number
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_read?: boolean | null
          message: string
          notification_id?: number
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_read?: boolean | null
          message?: string
          notification_id?: number
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          created_at: string | null
          cycle_id: number
          delivery_status: string | null
          notification_data: Json | null
          reminder_id: number
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id: number
          delivery_status?: string | null
          notification_data?: Json | null
          reminder_id?: number
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: number
          delivery_status?: string | null
          notification_data?: Json | null
          reminder_id?: number
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycles"
            referencedColumns: ["cycle_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: number
          created_at: string
          driver_id: number
          duration_days: number | null
          duration_end_date: string | null
          duration_start_date: string | null
          payment_date: string
          payment_id: number
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          period: string | null
          school_id: number | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: number
          created_at?: string
          driver_id: number
          duration_days?: number | null
          duration_end_date?: string | null
          duration_start_date?: string | null
          payment_date: string
          payment_id?: number
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          period?: string | null
          school_id?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: number
          created_at?: string
          driver_id?: number
          duration_days?: number | null
          duration_end_date?: string | null
          duration_start_date?: string | null
          payment_date?: string
          payment_id?: number
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          period?: string | null
          school_id?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      phone_users: {
        Row: {
          created_at: string | null
          email: string
          id: number
          password_hash: string
          phone_number: string
          profile_completed: boolean | null
          updated_at: string | null
          user_type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          password_hash: string
          phone_number: string
          profile_completed?: boolean | null
          updated_at?: string | null
          user_type: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          password_hash?: string
          phone_number?: string
          profile_completed?: boolean | null
          updated_at?: string | null
          user_type?: string
        }
        Relationships: []
      }
      push_notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          data: Json | null
          error_message: string | null
          last_attempt_at: string | null
          message: string
          notification_token: string
          queue_id: number
          sent_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          last_attempt_at?: string | null
          message: string
          notification_token: string
          queue_id?: number
          sent_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          data?: Json | null
          error_message?: string | null
          last_attempt_at?: string | null
          message?: string
          notification_token?: string
          queue_id?: number
          sent_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: number
          comment: string | null
          created_at: string
          driver_id: number
          rating: number
          review_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: number
          comment?: string | null
          created_at?: string
          driver_id: number
          rating: number
          review_id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: number
          comment?: string | null
          created_at?: string
          driver_id?: number
          rating?: number
          review_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "reviews_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string
          city: string | null
          code: string | null
          contact_number: string
          country: string | null
          created_at: string
          driver_count: number | null
          email: string
          google_place_id: string | null
          latitude: number | null
          locality: string
          location_accuracy: number | null
          location_source: string | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          pincode: string
          principal_contact: string | null
          principal_name: string | null
          route_count: number | null
          school_id: number
          state: string | null
          status: string | null
          student_count: number | null
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          code?: string | null
          contact_number: string
          country?: string | null
          created_at?: string
          driver_count?: number | null
          email: string
          google_place_id?: string | null
          latitude?: number | null
          locality: string
          location_accuracy?: number | null
          location_source?: string | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          pincode: string
          principal_contact?: string | null
          principal_name?: string | null
          route_count?: number | null
          school_id?: number
          state?: string | null
          status?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          code?: string | null
          contact_number?: string
          country?: string | null
          created_at?: string
          driver_count?: number | null
          email?: string
          google_place_id?: string | null
          latitude?: number | null
          locality?: string
          location_accuracy?: number | null
          location_source?: string | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          pincode?: string
          principal_contact?: string | null
          principal_name?: string | null
          route_count?: number | null
          school_id?: number
          state?: string | null
          status?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class: string
          created_at: string
          drop_accuracy: number | null
          drop_address: string
          drop_google_place_id: string | null
          drop_latitude: number | null
          drop_location_source: string | null
          drop_longitude: number | null
          drop_pincode: string
          drop_time: string
          name: string
          notification_token: string | null
          phone_number: string | null
          pickup_accuracy: number | null
          pickup_address: string
          pickup_google_place_id: string | null
          pickup_latitude: number | null
          pickup_location_source: string | null
          pickup_longitude: number | null
          pickup_pincode: string
          pickup_time: string
          school_id: number
          section: string
          student_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class: string
          created_at?: string
          drop_accuracy?: number | null
          drop_address: string
          drop_google_place_id?: string | null
          drop_latitude?: number | null
          drop_location_source?: string | null
          drop_longitude?: number | null
          drop_pincode: string
          drop_time: string
          name: string
          notification_token?: string | null
          phone_number?: string | null
          pickup_accuracy?: number | null
          pickup_address: string
          pickup_google_place_id?: string | null
          pickup_latitude?: number | null
          pickup_location_source?: string | null
          pickup_longitude?: number | null
          pickup_pincode: string
          pickup_time: string
          school_id: number
          section: string
          student_id?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: string
          created_at?: string
          drop_accuracy?: number | null
          drop_address?: string
          drop_google_place_id?: string | null
          drop_latitude?: number | null
          drop_location_source?: string | null
          drop_longitude?: number | null
          drop_pincode?: string
          drop_time?: string
          name?: string
          notification_token?: string | null
          phone_number?: string | null
          pickup_accuracy?: number | null
          pickup_address?: string
          pickup_google_place_id?: string | null
          pickup_latitude?: number | null
          pickup_location_source?: string | null
          pickup_longitude?: number | null
          pickup_pincode?: string
          pickup_time?: string
          school_id?: number
          section?: string
          student_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
        ]
      }
      subscription_cycles: {
        Row: {
          booking_id: number
          created_at: string | null
          cycle_end_date: string
          cycle_id: number
          cycle_start_date: string
          discount_amount: number | null
          driver_id: number
          escalated: boolean | null
          escalated_at: string | null
          final_amount: number
          monthly_fare: number
          months_paid: number
          payment_status: string | null
          reminder_sent_count: number | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: number
          created_at?: string | null
          cycle_end_date: string
          cycle_id?: number
          cycle_start_date: string
          discount_amount?: number | null
          driver_id: number
          escalated?: boolean | null
          escalated_at?: string | null
          final_amount: number
          monthly_fare: number
          months_paid: number
          payment_status?: string | null
          reminder_sent_count?: number | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: number
          created_at?: string | null
          cycle_end_date?: string
          cycle_id?: number
          cycle_start_date?: string
          discount_amount?: number | null
          driver_id?: number
          escalated?: boolean | null
          escalated_at?: string | null
          final_amount?: number
          monthly_fare?: number
          months_paid?: number
          payment_status?: string | null
          reminder_sent_count?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cycles_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "subscription_cycles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          booking_id: number
          coupon_code: string | null
          created_at: string | null
          cycle_id: number
          discount_applied: number | null
          driver_id: number
          months_covered: number
          payment_method: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          subscription_payment_id: number
          transaction_date: string | null
          transaction_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: number
          coupon_code?: string | null
          created_at?: string | null
          cycle_id: number
          discount_applied?: number | null
          driver_id: number
          months_covered: number
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          subscription_payment_id?: number
          transaction_date?: string | null
          transaction_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: number
          coupon_code?: string | null
          created_at?: string | null
          cycle_id?: number
          discount_applied?: number | null
          driver_id?: number
          months_covered?: number
          payment_method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          subscription_payment_id?: number
          transaction_date?: string | null
          transaction_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "subscription_payments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "subscription_cycles"
            referencedColumns: ["cycle_id"]
          },
          {
            foreignKeyName: "subscription_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      trip_sessions: {
        Row: {
          actual_duration_minutes: number | null
          actual_end_time: string | null
          actual_start_time: string | null
          created_at: string | null
          driver_id: number
          end_latitude: number | null
          end_longitude: number | null
          estimated_duration_minutes: number | null
          is_return_journey: boolean | null
          notes: string | null
          return_route_data: Json | null
          route_data: Json | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          school_id: number | null
          start_latitude: number | null
          start_longitude: number | null
          status: string | null
          students_dropped: number | null
          total_distance_km: number | null
          total_students: number | null
          trip_session_id: number
          trip_type: string
          updated_at: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          created_at?: string | null
          driver_id: number
          end_latitude?: number | null
          end_longitude?: number | null
          estimated_duration_minutes?: number | null
          is_return_journey?: boolean | null
          notes?: string | null
          return_route_data?: Json | null
          route_data?: Json | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          school_id?: number | null
          start_latitude?: number | null
          start_longitude?: number | null
          status?: string | null
          students_dropped?: number | null
          total_distance_km?: number | null
          total_students?: number | null
          trip_session_id?: number
          trip_type: string
          updated_at?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          created_at?: string | null
          driver_id?: number
          end_latitude?: number | null
          end_longitude?: number | null
          estimated_duration_minutes?: number | null
          is_return_journey?: boolean | null
          notes?: string | null
          return_route_data?: Json | null
          route_data?: Json | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          school_id?: number | null
          start_latitude?: number | null
          start_longitude?: number | null
          status?: string | null
          students_dropped?: number | null
          total_distance_km?: number | null
          total_students?: number | null
          trip_session_id?: number
          trip_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      trip_students: {
        Row: {
          actual_drop_distance: number | null
          actual_pickup_distance: number | null
          created_at: string | null
          drop_latitude: number | null
          drop_longitude: number | null
          drop_order: number | null
          drop_status: string | null
          drop_time: string | null
          estimated_drop_time: string | null
          estimated_pickup_time: string | null
          notes: string | null
          parent_notified_drop: boolean | null
          parent_notified_pickup: boolean | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_order: number | null
          pickup_status: string | null
          pickup_time: string | null
          student_id: number
          student_notes: string | null
          trip_session_id: number
          trip_student_id: number
          updated_at: string | null
        }
        Insert: {
          actual_drop_distance?: number | null
          actual_pickup_distance?: number | null
          created_at?: string | null
          drop_latitude?: number | null
          drop_longitude?: number | null
          drop_order?: number | null
          drop_status?: string | null
          drop_time?: string | null
          estimated_drop_time?: string | null
          estimated_pickup_time?: string | null
          notes?: string | null
          parent_notified_drop?: boolean | null
          parent_notified_pickup?: boolean | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_order?: number | null
          pickup_status?: string | null
          pickup_time?: string | null
          student_id: number
          student_notes?: string | null
          trip_session_id: number
          trip_student_id?: number
          updated_at?: string | null
        }
        Update: {
          actual_drop_distance?: number | null
          actual_pickup_distance?: number | null
          created_at?: string | null
          drop_latitude?: number | null
          drop_longitude?: number | null
          drop_order?: number | null
          drop_status?: string | null
          drop_time?: string | null
          estimated_drop_time?: string | null
          estimated_pickup_time?: string | null
          notes?: string | null
          parent_notified_drop?: boolean | null
          parent_notified_pickup?: boolean | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_order?: number | null
          pickup_status?: string | null
          pickup_time?: string | null
          student_id?: number
          student_notes?: string | null
          trip_session_id?: number
          trip_student_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "trip_students_trip_session_id_fkey"
            columns: ["trip_session_id"]
            isOneToOne: false
            referencedRelation: "active_trip_sessions"
            referencedColumns: ["trip_session_id"]
          },
          {
            foreignKeyName: "trip_students_trip_session_id_fkey"
            columns: ["trip_session_id"]
            isOneToOne: false
            referencedRelation: "trip_sessions"
            referencedColumns: ["trip_session_id"]
          },
        ]
      }
      unserviced_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          drop_address: string | null
          drop_pincode: string | null
          id: number
          pickup_address: string | null
          pickup_locality: string | null
          pickup_pincode: string | null
          requested_at: string | null
          status: string | null
          student_id: number | null
          student_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          drop_address?: string | null
          drop_pincode?: string | null
          id?: number
          pickup_address?: string | null
          pickup_locality?: string | null
          pickup_pincode?: string | null
          requested_at?: string | null
          status?: string | null
          student_id?: number | null
          student_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          drop_address?: string | null
          drop_pincode?: string | null
          id?: number
          pickup_address?: string | null
          pickup_locality?: string | null
          pickup_pincode?: string | null
          requested_at?: string | null
          status?: string | null
          student_id?: number | null
          student_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unserviced_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: number
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_driver_locations: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          cab_number: string | null
          driver_id: number | null
          driver_name: string | null
          heading: number | null
          is_tracking_enabled: boolean | null
          last_seen_at: string | null
          latitude: number | null
          location_id: number | null
          longitude: number | null
          phone: string | null
          speed: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      active_trip_sessions: {
        Row: {
          actual_start_time: string | null
          cab_number: string | null
          driver_id: number | null
          driver_name: string | null
          dropped_count: number | null
          picked_up_count: number | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          school_id: number | null
          school_name: string | null
          start_latitude: number | null
          start_longitude: number | null
          status: string | null
          total_students: number | null
          trip_session_id: number | null
          trip_type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["driver_id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "user" | "driver" | "admin" | "master_admin" | "sub_admin" | "school_admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      booking_type: "one_way" | "round_trip" | "monthly"
      payment_mode: "cash" | "online" | "wallet"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payment_type: "subscription" | "one_time"
      withdrawal_status: "pending" | "completed" | "rejected"
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
      app_role: ["user", "driver", "admin", "master_admin", "sub_admin", "school_admin"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      booking_type: ["one_way", "round_trip", "monthly"],
      payment_mode: ["cash", "online", "wallet"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payment_type: ["subscription", "one_time"],
      withdrawal_status: ["pending", "completed", "rejected"],
    },
  },
} as const
