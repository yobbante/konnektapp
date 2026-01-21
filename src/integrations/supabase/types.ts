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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      conversations: {
        Row: {
          client_id: string
          created_at: string
          gp_id: string
          id: string
          last_message_at: string | null
          order_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          gp_id: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          gp_id?: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_request_responses: {
        Row: {
          available_pickup_date: string | null
          created_at: string
          currency: string
          estimated_delivery_days: number | null
          gp_id: string
          id: string
          message: string | null
          price_proposed: number
          request_id: string
          status: string
        }
        Insert: {
          available_pickup_date?: string | null
          created_at?: string
          currency?: string
          estimated_delivery_days?: number | null
          gp_id: string
          id?: string
          message?: string | null
          price_proposed: number
          request_id: string
          status?: string
        }
        Update: {
          available_pickup_date?: string | null
          created_at?: string
          currency?: string
          estimated_delivery_days?: number | null
          gp_id?: string
          id?: string
          message?: string | null
          price_proposed?: number
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_request_responses_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_request_responses_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_requests: {
        Row: {
          accepted_offer_id: string | null
          additional_services: string[] | null
          budget_max: number | null
          budget_min: number | null
          client_id: string
          created_at: string
          description: string
          destination_city: string
          destination_country: string
          expires_at: string | null
          id: string
          is_fragile: boolean | null
          is_urgent: boolean | null
          origin_city: string
          origin_country: string
          pickup_date_from: string | null
          pickup_date_to: string | null
          request_number: string
          shipment_type: string
          status: string
          transport_type: string | null
          updated_at: string
          volume_estimate: string | null
          weight_estimate: number | null
        }
        Insert: {
          accepted_offer_id?: string | null
          additional_services?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          client_id: string
          created_at?: string
          description: string
          destination_city: string
          destination_country: string
          expires_at?: string | null
          id?: string
          is_fragile?: boolean | null
          is_urgent?: boolean | null
          origin_city: string
          origin_country?: string
          pickup_date_from?: string | null
          pickup_date_to?: string | null
          request_number: string
          shipment_type: string
          status?: string
          transport_type?: string | null
          updated_at?: string
          volume_estimate?: string | null
          weight_estimate?: number | null
        }
        Update: {
          accepted_offer_id?: string | null
          additional_services?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          client_id?: string
          created_at?: string
          description?: string
          destination_city?: string
          destination_country?: string
          expires_at?: string | null
          id?: string
          is_fragile?: boolean | null
          is_urgent?: boolean | null
          origin_city?: string
          origin_country?: string
          pickup_date_from?: string | null
          pickup_date_to?: string | null
          request_number?: string
          shipment_type?: string
          status?: string
          transport_type?: string | null
          updated_at?: string
          volume_estimate?: string | null
          weight_estimate?: number | null
        }
        Relationships: []
      }
      dispute_history: {
        Row: {
          action: string
          actor_id: string
          actor_type: string
          attachments: string[] | null
          created_at: string
          dispute_id: string
          id: string
          new_status: Database["public"]["Enums"]["dispute_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["dispute_status"] | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: string
          attachments?: string[] | null
          created_at?: string
          dispute_id: string
          id?: string
          new_status?: Database["public"]["Enums"]["dispute_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["dispute_status"] | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: string
          attachments?: string[] | null
          created_at?: string
          dispute_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["dispute_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["dispute_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_history_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_moderator: string | null
          attachments: string[] | null
          category: Database["public"]["Enums"]["dispute_category"]
          closed_at: string | null
          compensation_amount: number | null
          created_at: string
          deadline_resolution: string | null
          deadline_response: string | null
          description: string
          dispute_number: string
          final_decision: string | null
          id: string
          initiated_by: string
          initiated_by_type: string
          order_id: string
          provisional_decision: string | null
          responsible_party: string | null
          sanction_applied: Database["public"]["Enums"]["sanction_type"] | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          assigned_moderator?: string | null
          attachments?: string[] | null
          category: Database["public"]["Enums"]["dispute_category"]
          closed_at?: string | null
          compensation_amount?: number | null
          created_at?: string
          deadline_resolution?: string | null
          deadline_response?: string | null
          description: string
          dispute_number: string
          final_decision?: string | null
          id?: string
          initiated_by: string
          initiated_by_type: string
          order_id: string
          provisional_decision?: string | null
          responsible_party?: string | null
          sanction_applied?: Database["public"]["Enums"]["sanction_type"] | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          assigned_moderator?: string | null
          attachments?: string[] | null
          category?: Database["public"]["Enums"]["dispute_category"]
          closed_at?: string | null
          compensation_amount?: number | null
          created_at?: string
          deadline_resolution?: string | null
          deadline_response?: string | null
          description?: string
          dispute_number?: string
          final_decision?: string | null
          id?: string
          initiated_by?: string
          initiated_by_type?: string
          order_id?: string
          provisional_decision?: string | null
          responsible_party?: string | null
          sanction_applied?: Database["public"]["Enums"]["sanction_type"] | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          gp_id: string
          held_at: string | null
          id: string
          order_id: string
          payment_method: string | null
          payment_reference: string | null
          refund_reason: string | null
          refunded_at: string | null
          release_reason: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: string
          gp_id: string
          held_at?: string | null
          id?: string
          order_id: string
          payment_method?: string | null
          payment_reference?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          gp_id?: string
          held_at?: string | null
          id?: string
          order_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          rate: number
          to_currency: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          to_currency: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      flat_rate_object_types: {
        Row: {
          created_at: string
          default_price: number | null
          id: string
          is_active: boolean | null
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gp_flat_rate_pricing: {
        Row: {
          created_at: string
          currency: string | null
          gp_id: string
          id: string
          is_active: boolean | null
          object_type_id: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          gp_id: string
          id?: string
          is_active?: boolean | null
          object_type_id: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          gp_id?: string
          id?: string
          is_active?: boolean | null
          object_type_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_flat_rate_pricing_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_flat_rate_pricing_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_flat_rate_pricing_object_type_id_fkey"
            columns: ["object_type_id"]
            isOneToOne: false
            referencedRelation: "flat_rate_object_types"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_offers: {
        Row: {
          airline: string | null
          arrival_date: string | null
          available_capacity: number
          baggage_restrictions: string | null
          baggage_types_accepted: string[] | null
          bookings_count: number | null
          conditions: string | null
          created_at: string
          currency: string
          departure_date: string
          description: string | null
          destination_city: string
          destination_country: string
          explicit_restrictions: string[] | null
          flight_number: string | null
          gp_id: string
          id: string
          max_weight: number | null
          min_weight: number | null
          origin_city: string
          origin_country: string
          price_per_kg: number
          status: Database["public"]["Enums"]["offer_status"]
          total_capacity: number
          transport_type: Database["public"]["Enums"]["gp_type"]
          updated_at: string
          vehicle_id: string | null
          views_count: number | null
        }
        Insert: {
          airline?: string | null
          arrival_date?: string | null
          available_capacity: number
          baggage_restrictions?: string | null
          baggage_types_accepted?: string[] | null
          bookings_count?: number | null
          conditions?: string | null
          created_at?: string
          currency?: string
          departure_date: string
          description?: string | null
          destination_city: string
          destination_country: string
          explicit_restrictions?: string[] | null
          flight_number?: string | null
          gp_id: string
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          origin_city: string
          origin_country?: string
          price_per_kg: number
          status?: Database["public"]["Enums"]["offer_status"]
          total_capacity: number
          transport_type: Database["public"]["Enums"]["gp_type"]
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number | null
        }
        Update: {
          airline?: string | null
          arrival_date?: string | null
          available_capacity?: number
          baggage_restrictions?: string | null
          baggage_types_accepted?: string[] | null
          bookings_count?: number | null
          conditions?: string | null
          created_at?: string
          currency?: string
          departure_date?: string
          description?: string | null
          destination_city?: string
          destination_country?: string
          explicit_restrictions?: string[] | null
          flight_number?: string | null
          gp_id?: string
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          origin_city?: string
          origin_country?: string
          price_per_kg?: number
          status?: Database["public"]["Enums"]["offer_status"]
          total_capacity?: number
          transport_type?: Database["public"]["Enums"]["gp_type"]
          updated_at?: string
          vehicle_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gp_offers_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_offers_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_offers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_price_history: {
        Row: {
          currency: string
          destination_city: string | null
          destination_country: string | null
          gp_id: string
          id: string
          offer_id: string | null
          origin_city: string | null
          origin_country: string | null
          price_per_kg: number
          recorded_at: string
        }
        Insert: {
          currency?: string
          destination_city?: string | null
          destination_country?: string | null
          gp_id: string
          id?: string
          offer_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          price_per_kg: number
          recorded_at?: string
        }
        Update: {
          currency?: string
          destination_city?: string | null
          destination_country?: string | null
          gp_id?: string
          id?: string
          offer_id?: string | null
          origin_city?: string | null
          origin_country?: string | null
          price_per_kg?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_price_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_price_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_price_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "gp_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_profiles: {
        Row: {
          address: string | null
          business_name: string
          business_registration_url: string | null
          city: string
          country_code: string
          created_at: string
          description: string | null
          explicit_restrictions: string[] | null
          fleet_size: number | null
          gp_type: Database["public"]["Enums"]["gp_type"]
          id: string
          id_document_url: string | null
          id_number: string | null
          id_type: string | null
          insurance_document_url: string | null
          international_destinations: string[] | null
          phone: string
          rating: number | null
          status: Database["public"]["Enums"]["gp_status"]
          subscription: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries: number | null
          total_reviews: number | null
          transport_license_url: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          whatsapp: string | null
          years_experience: number | null
          zones_covered: string[] | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_registration_url?: string | null
          city: string
          country_code?: string
          created_at?: string
          description?: string | null
          explicit_restrictions?: string[] | null
          fleet_size?: number | null
          gp_type: Database["public"]["Enums"]["gp_type"]
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          insurance_document_url?: string | null
          international_destinations?: string[] | null
          phone: string
          rating?: number | null
          status?: Database["public"]["Enums"]["gp_status"]
          subscription?: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries?: number | null
          total_reviews?: number | null
          transport_license_url?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          whatsapp?: string | null
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_registration_url?: string | null
          city?: string
          country_code?: string
          created_at?: string
          description?: string | null
          explicit_restrictions?: string[] | null
          fleet_size?: number | null
          gp_type?: Database["public"]["Enums"]["gp_type"]
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_type?: string | null
          insurance_document_url?: string | null
          international_destinations?: string[] | null
          phone?: string
          rating?: number | null
          status?: Database["public"]["Enums"]["gp_status"]
          subscription?: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries?: number | null
          total_reviews?: number | null
          transport_license_url?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          whatsapp?: string | null
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Relationships: []
      }
      gp_wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          gp_id: string
          id: string
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          gp_id: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          gp_id?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_wallets_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_wallets_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          new_message_alerts: boolean | null
          new_offer_alerts: boolean | null
          order_status_alerts: boolean | null
          push_notifications: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          new_message_alerts?: boolean | null
          new_offer_alerts?: boolean | null
          order_status_alerts?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          new_message_alerts?: boolean | null
          new_offer_alerts?: boolean | null
          order_status_alerts?: boolean | null
          push_notifications?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_favorites: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "gp_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_logistics: {
        Row: {
          created_at: string
          declared_value: number | null
          delivery_address: string
          estimated_volume: string | null
          estimated_weight: number
          id: string
          is_fragile: boolean
          is_urgent: boolean
          locked_at: string | null
          merchandise_description: string | null
          merchandise_type: string
          order_id: string
          pickup_address: string
          pickup_date: string
          pickup_time_slot: string | null
          special_conditions: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          declared_value?: number | null
          delivery_address: string
          estimated_volume?: string | null
          estimated_weight: number
          id?: string
          is_fragile?: boolean
          is_urgent?: boolean
          locked_at?: string | null
          merchandise_description?: string | null
          merchandise_type: string
          order_id: string
          pickup_address: string
          pickup_date: string
          pickup_time_slot?: string | null
          special_conditions?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          declared_value?: number | null
          delivery_address?: string
          estimated_volume?: string | null
          estimated_weight?: number
          id?: string
          is_fragile?: boolean
          is_urgent?: boolean
          locked_at?: string | null
          merchandise_description?: string | null
          merchandise_type?: string
          order_id?: string
          pickup_address?: string
          pickup_date?: string
          pickup_time_slot?: string | null
          special_conditions?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logistics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string
          changed_by_type: string
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by: string
          changed_by_type: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string
          changed_by_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          client_id: string
          commission_amount: number
          created_at: string
          currency: string
          declared_value: number | null
          delivery_date: string | null
          description: string | null
          destination_city: string
          destination_country: string
          dimensions: string | null
          escrow_id: string | null
          gp_id: string
          has_insurance: boolean | null
          id: string
          insurance_amount: number | null
          logistics_status: string
          offer_id: string | null
          order_number: string
          origin_city: string
          origin_country: string
          payment_status: string | null
          pickup_date: string | null
          price_per_kg: number
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_code: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id: string
          commission_amount?: number
          created_at?: string
          currency?: string
          declared_value?: number | null
          delivery_date?: string | null
          description?: string | null
          destination_city: string
          destination_country: string
          dimensions?: string | null
          escrow_id?: string | null
          gp_id: string
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          logistics_status?: string
          offer_id?: string | null
          order_number: string
          origin_city: string
          origin_country: string
          payment_status?: string | null
          pickup_date?: string | null
          price_per_kg: number
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_code?: string | null
          updated_at?: string
          weight: number
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string
          commission_amount?: number
          created_at?: string
          currency?: string
          declared_value?: number | null
          delivery_date?: string | null
          description?: string | null
          destination_city?: string
          destination_country?: string
          dimensions?: string | null
          escrow_id?: string | null
          gp_id?: string
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          logistics_status?: string
          offer_id?: string | null
          order_number?: string
          origin_city?: string
          origin_country?: string
          payment_status?: string | null
          pickup_date?: string | null
          price_per_kg?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          tracking_code?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "gp_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country_code: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_gp: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_gp?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_gp?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reputation_incidents: {
        Row: {
          created_at: string
          description: string | null
          dispute_id: string | null
          gp_id: string
          id: string
          incident_type: string
          new_score: number
          previous_score: number
          score_impact: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispute_id?: string | null
          gp_id: string
          id?: string
          incident_type: string
          new_score: number
          previous_score: number
          score_impact?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          dispute_id?: string | null
          gp_id?: string
          id?: string
          incident_type?: string
          new_score?: number
          previous_score?: number
          score_impact?: number
        }
        Relationships: [
          {
            foreignKeyName: "reputation_incidents_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_incidents_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_incidents_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          gp_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          gp_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          gp_id?: string
          id?: string
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions: {
        Row: {
          applied_by: string
          created_at: string
          dispute_id: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          is_permanent: boolean | null
          notes: string | null
          reason: string
          sanction_type: Database["public"]["Enums"]["sanction_type"]
          starts_at: string
          target_type: string
          target_user_id: string
        }
        Insert: {
          applied_by: string
          created_at?: string
          dispute_id?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_permanent?: boolean | null
          notes?: string | null
          reason: string
          sanction_type: Database["public"]["Enums"]["sanction_type"]
          starts_at?: string
          target_type: string
          target_user_id: string
        }
        Update: {
          applied_by?: string
          created_at?: string
          dispute_id?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          is_permanent?: boolean | null
          notes?: string | null
          reason?: string
          sanction_type?: Database["public"]["Enums"]["sanction_type"]
          starts_at?: string
          target_type?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          destination_city: string | null
          id: string
          max_price: number | null
          min_price: number | null
          min_weight: number | null
          notify_enabled: boolean
          origin_city: string | null
          transport_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_city?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          min_weight?: number | null
          notify_enabled?: boolean
          origin_city?: string | null
          transport_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_city?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          min_weight?: number | null
          notify_enabled?: boolean
          origin_city?: string | null
          transport_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_routes: {
        Row: {
          available_capacity_kg: number | null
          created_at: string
          currency: string
          days_of_week: number[]
          departure_time: string | null
          destination_city: string
          destination_country: string
          estimated_duration_hours: number | null
          gp_id: string
          id: string
          is_active: boolean
          origin_city: string
          origin_country: string
          price_per_kg: number
          route_name: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          available_capacity_kg?: number | null
          created_at?: string
          currency?: string
          days_of_week?: number[]
          departure_time?: string | null
          destination_city: string
          destination_country: string
          estimated_duration_hours?: number | null
          gp_id: string
          id?: string
          is_active?: boolean
          origin_city: string
          origin_country?: string
          price_per_kg: number
          route_name: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          available_capacity_kg?: number | null
          created_at?: string
          currency?: string
          days_of_week?: number[]
          departure_time?: string | null
          destination_city?: string
          destination_country?: string
          estimated_duration_hours?: number | null
          gp_id?: string
          id?: string
          is_active?: boolean
          origin_city?: string
          origin_country?: string
          price_per_kg?: number
          route_name?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_routes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_routes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string
          id?: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          order_id: string | null
          priority: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          ticket_number: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          ticket_number: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          priority?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_issues: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          id: string
          issue_type: string
          order_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          id?: string
          issue_type: string
          order_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          id?: string
          issue_type?: string
          order_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          order_id: string | null
          reference: string | null
          status: string
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "gp_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_favorites: {
        Row: {
          created_at: string
          gp_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gp_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gp_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporter_favorites_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporter_favorites_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_reputation: {
        Row: {
          created_at: string
          disputes_lost: number | null
          disputes_won: number | null
          excluded_at: string | null
          exclusion_reason: string | null
          gp_id: string
          id: string
          internal_score: number
          last_incident_at: string | null
          observation_reason: string | null
          observation_started_at: string | null
          reputation_status: Database["public"]["Enums"]["reputation_status"]
          suspended_until: string | null
          total_disputes: number | null
          total_suspensions: number | null
          total_warnings: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          disputes_lost?: number | null
          disputes_won?: number | null
          excluded_at?: string | null
          exclusion_reason?: string | null
          gp_id: string
          id?: string
          internal_score?: number
          last_incident_at?: string | null
          observation_reason?: string | null
          observation_started_at?: string | null
          reputation_status?: Database["public"]["Enums"]["reputation_status"]
          suspended_until?: string | null
          total_disputes?: number | null
          total_suspensions?: number | null
          total_warnings?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          disputes_lost?: number | null
          disputes_won?: number | null
          excluded_at?: string | null
          exclusion_reason?: string | null
          gp_id?: string
          id?: string
          internal_score?: number
          last_incident_at?: string | null
          observation_reason?: string | null
          observation_started_at?: string | null
          reputation_status?: Database["public"]["Enums"]["reputation_status"]
          suspended_until?: string | null
          total_disputes?: number | null
          total_suspensions?: number | null
          total_warnings?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporter_reputation_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporter_reputation_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_alerts: {
        Row: {
          alert_type: string
          created_at: string
          criteria: Json
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          criteria?: Json
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string
          gp_id: string
          height_m: number | null
          id: string
          is_active: boolean
          length_m: number | null
          max_volume_m3: number | null
          max_weight_kg: number | null
          name: string
          photo_url: string | null
          specifications: Json | null
          transport_category: string
          updated_at: string
          vehicle_type: string
          width_m: number | null
        }
        Insert: {
          created_at?: string
          gp_id: string
          height_m?: number | null
          id?: string
          is_active?: boolean
          length_m?: number | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          name: string
          photo_url?: string | null
          specifications?: Json | null
          transport_category: string
          updated_at?: string
          vehicle_type: string
          width_m?: number | null
        }
        Update: {
          created_at?: string
          gp_id?: string
          height_m?: number | null
          id?: string
          is_active?: boolean
          length_m?: number | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          name?: string
          photo_url?: string | null
          specifications?: Json | null
          transport_category?: string
          updated_at?: string
          vehicle_type?: string
          width_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_gp_profiles: {
        Row: {
          business_name: string | null
          city: string | null
          country_code: string | null
          created_at: string | null
          description: string | null
          fleet_size: number | null
          gp_type: Database["public"]["Enums"]["gp_type"] | null
          id: string | null
          international_destinations: string[] | null
          rating: number | null
          total_deliveries: number | null
          total_reviews: number | null
          verified_at: string | null
          years_experience: number | null
          zones_covered: string[] | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          fleet_size?: number | null
          gp_type?: Database["public"]["Enums"]["gp_type"] | null
          id?: string | null
          international_destinations?: string[] | null
          rating?: number | null
          total_deliveries?: number | null
          total_reviews?: number | null
          verified_at?: string | null
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          description?: string | null
          fleet_size?: number | null
          gp_type?: Database["public"]["Enums"]["gp_type"] | null
          id?: string | null
          international_destinations?: string[] | null
          rating?: number | null
          total_deliveries?: number | null
          total_reviews?: number | null
          verified_at?: string | null
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_create_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_order_id?: string
          p_reference?: string
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_wallet_id: string
        }
        Returns: string
      }
      assign_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
      create_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_order_id?: string
          p_reference?: string
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_wallet_id: string
        }
        Returns: string
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gp_verified: { Args: { gp_id: string }; Returns: boolean }
      is_order_gp: { Args: { order_gp_id: string }; Returns: boolean }
      owns_gp_offer: { Args: { offer_gp_id: string }; Returns: boolean }
      owns_gp_wallet: { Args: { wallet_gp_id: string }; Returns: boolean }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      dispute_category:
        | "delay_unjustified"
        | "partial_loss"
        | "total_loss"
        | "deterioration"
        | "non_conformity"
        | "transporter_silence"
        | "client_fault"
      dispute_status:
        | "open"
        | "under_review"
        | "awaiting_response"
        | "provisional_decision"
        | "closed"
      gp_status: "pending" | "verified" | "suspended" | "rejected"
      gp_subscription: "free" | "premium"
      gp_type:
        | "express"
        | "routier"
        | "maritime"
        | "aerien"
        | "voyageur"
        | "agence"
        | "bagages_international"
      offer_status: "active" | "paused" | "expired" | "completed"
      order_status:
        | "pending"
        | "accepted"
        | "collected"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "disputed"
      reputation_status:
        | "verified"
        | "under_observation"
        | "suspended"
        | "excluded"
      sanction_type:
        | "warning"
        | "financial_compensation"
        | "full_refund"
        | "temporary_suspension"
        | "permanent_exclusion"
      transaction_type:
        | "earning"
        | "withdrawal"
        | "commission"
        | "refund"
        | "bonus"
      user_role_extended:
        | "super_admin"
        | "moderator_arbitrage"
        | "transporter_verified"
        | "transporter_observation"
        | "transporter_suspended"
        | "client_standard"
        | "client_premium"
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
      app_role: ["admin", "moderator", "user"],
      dispute_category: [
        "delay_unjustified",
        "partial_loss",
        "total_loss",
        "deterioration",
        "non_conformity",
        "transporter_silence",
        "client_fault",
      ],
      dispute_status: [
        "open",
        "under_review",
        "awaiting_response",
        "provisional_decision",
        "closed",
      ],
      gp_status: ["pending", "verified", "suspended", "rejected"],
      gp_subscription: ["free", "premium"],
      gp_type: [
        "express",
        "routier",
        "maritime",
        "aerien",
        "voyageur",
        "agence",
        "bagages_international",
      ],
      offer_status: ["active", "paused", "expired", "completed"],
      order_status: [
        "pending",
        "accepted",
        "collected",
        "in_transit",
        "delivered",
        "cancelled",
        "disputed",
      ],
      reputation_status: [
        "verified",
        "under_observation",
        "suspended",
        "excluded",
      ],
      sanction_type: [
        "warning",
        "financial_compensation",
        "full_refund",
        "temporary_suspension",
        "permanent_exclusion",
      ],
      transaction_type: [
        "earning",
        "withdrawal",
        "commission",
        "refund",
        "bonus",
      ],
      user_role_extended: [
        "super_admin",
        "moderator_arbitrage",
        "transporter_verified",
        "transporter_observation",
        "transporter_suspended",
        "client_standard",
        "client_premium",
      ],
    },
  },
} as const
