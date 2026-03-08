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
      client_loyalty: {
        Row: {
          available_points: number
          created_at: string
          current_tier_id: string | null
          id: string
          joined_at: string
          points_redeemed: number
          tier_updated_at: string | null
          total_orders: number
          total_points: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_points?: number
          created_at?: string
          current_tier_id?: string | null
          id?: string
          joined_at?: string
          points_redeemed?: number
          tier_updated_at?: string | null
          total_orders?: number
          total_points?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_points?: number
          created_at?: string
          current_tier_id?: string | null
          id?: string
          joined_at?: string
          points_redeemed?: number
          tier_updated_at?: string | null
          total_orders?: number
          total_points?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_loyalty_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_wallets: {
        Row: {
          available_balance: number
          created_at: string
          credit_bonus: number
          currency: string
          escrow_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          credit_bonus?: number
          currency?: string
          escrow_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          credit_bonus?: number
          currency?: string
          escrow_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
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
      delivery_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by_name: string | null
          confirmed_by_phone: string
          created_account: boolean | null
          created_user_id: string | null
          id: string
          order_id: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by_name?: string | null
          confirmed_by_phone: string
          created_account?: boolean | null
          created_user_id?: string | null
          id?: string
          order_id: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by_name?: string | null
          confirmed_by_phone?: string
          created_account?: boolean | null
          created_user_id?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "delivery_confirmations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_logs: {
        Row: {
          action: string
          actor: string
          commission_amount: number
          created_at: string
          id: string
          new_amount: number
          order_id: string
          previous_amount: number
        }
        Insert: {
          action: string
          actor?: string
          commission_amount?: number
          created_at?: string
          id?: string
          new_amount?: number
          order_id: string
          previous_amount?: number
        }
        Update: {
          action?: string
          actor?: string
          commission_amount?: number
          created_at?: string
          id?: string
          new_amount?: number
          order_id?: string
          previous_amount?: number
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          amount: number
          client_id: string
          commission_amount: number
          created_at: string
          currency: string
          gp_id: string
          held_at: string | null
          id: string
          mission_id: string | null
          net_to_gp: number
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
          commission_amount?: number
          created_at?: string
          currency?: string
          gp_id: string
          held_at?: string | null
          id?: string
          mission_id?: string | null
          net_to_gp?: number
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
          commission_amount?: number
          created_at?: string
          currency?: string
          gp_id?: string
          held_at?: string | null
          id?: string
          mission_id?: string | null
          net_to_gp?: number
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "escrow_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
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
      freight_proposals: {
        Row: {
          available_pickup_date: string | null
          created_at: string
          currency: string | null
          estimated_transit_days: number | null
          id: string
          includes_customs: boolean | null
          includes_insurance: boolean | null
          includes_last_mile: boolean | null
          message: string | null
          price_proposed: number
          provider_gp_id: string
          request_id: string
          routing_description: string | null
          status: string
        }
        Insert: {
          available_pickup_date?: string | null
          created_at?: string
          currency?: string | null
          estimated_transit_days?: number | null
          id?: string
          includes_customs?: boolean | null
          includes_insurance?: boolean | null
          includes_last_mile?: boolean | null
          message?: string | null
          price_proposed: number
          provider_gp_id: string
          request_id: string
          routing_description?: string | null
          status?: string
        }
        Update: {
          available_pickup_date?: string | null
          created_at?: string
          currency?: string | null
          estimated_transit_days?: number | null
          id?: string
          includes_customs?: boolean | null
          includes_insurance?: boolean | null
          includes_last_mile?: boolean | null
          message?: string | null
          price_proposed?: number
          provider_gp_id?: string
          request_id?: string
          routing_description?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_proposals_provider_gp_id_fkey"
            columns: ["provider_gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_proposals_provider_gp_id_fkey"
            columns: ["provider_gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_proposals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "freight_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_requests: {
        Row: {
          accepted_proposal_id: string | null
          client_id: string
          created_at: string
          currency: string | null
          customs_required: boolean | null
          declared_value: number | null
          destination_city: string
          destination_country: string
          destination_port_or_airport: string | null
          dimensions_cm: string | null
          final_delivery_mode: string | null
          freight_mode: string
          id: string
          incoterm: string | null
          insurance_required: boolean | null
          is_fragile: boolean | null
          is_urgent: boolean | null
          is_vehicle: boolean | null
          merchandise_description: string | null
          merchandise_type: string | null
          notes: string | null
          origin_city: string
          origin_country: string
          origin_port_or_airport: string | null
          pickup_date_from: string | null
          pickup_date_to: string | null
          request_number: string
          status: string
          updated_at: string
          urgency_level: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_running: boolean | null
          vehicle_vin: string | null
          vehicle_year: number | null
          volume_m3: number | null
          weight_kg: number | null
        }
        Insert: {
          accepted_proposal_id?: string | null
          client_id: string
          created_at?: string
          currency?: string | null
          customs_required?: boolean | null
          declared_value?: number | null
          destination_city: string
          destination_country?: string
          destination_port_or_airport?: string | null
          dimensions_cm?: string | null
          final_delivery_mode?: string | null
          freight_mode?: string
          id?: string
          incoterm?: string | null
          insurance_required?: boolean | null
          is_fragile?: boolean | null
          is_urgent?: boolean | null
          is_vehicle?: boolean | null
          merchandise_description?: string | null
          merchandise_type?: string | null
          notes?: string | null
          origin_city: string
          origin_country?: string
          origin_port_or_airport?: string | null
          pickup_date_from?: string | null
          pickup_date_to?: string | null
          request_number: string
          status?: string
          updated_at?: string
          urgency_level?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_running?: boolean | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Update: {
          accepted_proposal_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string | null
          customs_required?: boolean | null
          declared_value?: number | null
          destination_city?: string
          destination_country?: string
          destination_port_or_airport?: string | null
          dimensions_cm?: string | null
          final_delivery_mode?: string | null
          freight_mode?: string
          id?: string
          incoterm?: string | null
          insurance_required?: boolean | null
          is_fragile?: boolean | null
          is_urgent?: boolean | null
          is_vehicle?: boolean | null
          merchandise_description?: string | null
          merchandise_type?: string | null
          notes?: string | null
          origin_city?: string
          origin_country?: string
          origin_port_or_airport?: string | null
          pickup_date_from?: string | null
          pickup_date_to?: string | null
          request_number?: string
          status?: string
          updated_at?: string
          urgency_level?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_running?: boolean | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
          volume_m3?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      freight_tracking_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_label: string
          event_type: string
          freight_request_id: string | null
          id: string
          location: string | null
          notes: string | null
          order_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_label: string
          event_type: string
          freight_request_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          order_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_label?: string
          event_type?: string
          freight_request_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_tracking_events_freight_request_id_fkey"
            columns: ["freight_request_id"]
            isOneToOne: false
            referencedRelation: "freight_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "freight_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "freight_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      gp_geolocation_consent: {
        Row: {
          consent_given: boolean
          consent_given_at: string | null
          created_at: string
          gp_id: string
          id: string
          last_check_at: string | null
          last_detected_city: string | null
          last_detected_country: string | null
          last_position_lat: number | null
          last_position_lng: number | null
          tracking_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_given?: boolean
          consent_given_at?: string | null
          created_at?: string
          gp_id: string
          id?: string
          last_check_at?: string | null
          last_detected_city?: string | null
          last_detected_country?: string | null
          last_position_lat?: number | null
          last_position_lng?: number | null
          tracking_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_given?: boolean
          consent_given_at?: string | null
          created_at?: string
          gp_id?: string
          id?: string
          last_check_at?: string | null
          last_detected_city?: string | null
          last_detected_country?: string | null
          last_position_lat?: number | null
          last_position_lng?: number | null
          tracking_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_geolocation_consent_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_geolocation_consent_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_geolocation_logs: {
        Row: {
          action_triggered: string | null
          created_at: string
          detected_city: string | null
          detected_country: string
          gp_id: string
          id: string
          latitude: number | null
          longitude: number | null
          orders_affected: string[] | null
        }
        Insert: {
          action_triggered?: string | null
          created_at?: string
          detected_city?: string | null
          detected_country: string
          gp_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          orders_affected?: string[] | null
        }
        Update: {
          action_triggered?: string | null
          created_at?: string
          detected_city?: string | null
          detected_country?: string
          gp_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          orders_affected?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "gp_geolocation_logs_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_geolocation_logs_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_navette_change_requests: {
        Row: {
          admin_notes: string | null
          auto_approved: boolean | null
          created_at: string
          gp_id: string
          id: string
          justification: string | null
          new_destination_city: string
          new_destination_country: string
          new_origin_city: string
          new_origin_country: string
          old_destination_city: string
          old_destination_country: string
          old_origin_city: string
          old_origin_country: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          auto_approved?: boolean | null
          created_at?: string
          gp_id: string
          id?: string
          justification?: string | null
          new_destination_city: string
          new_destination_country?: string
          new_origin_city: string
          new_origin_country?: string
          old_destination_city: string
          old_destination_country?: string
          old_origin_city: string
          old_origin_country?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          auto_approved?: boolean | null
          created_at?: string
          gp_id?: string
          id?: string
          justification?: string | null
          new_destination_city?: string
          new_destination_country?: string
          new_origin_city?: string
          new_origin_country?: string
          old_destination_city?: string
          old_destination_country?: string
          old_origin_city?: string
          old_origin_country?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_navette_change_requests_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_navette_change_requests_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_navettes: {
        Row: {
          address_destination: string | null
          address_origin: string | null
          created_at: string
          destination_city: string
          destination_country: string
          gp_id: string
          id: string
          is_active: boolean
          is_primary: boolean
          origin_city: string
          origin_country: string
          phone_secondary: string | null
          updated_at: string
        }
        Insert: {
          address_destination?: string | null
          address_origin?: string | null
          created_at?: string
          destination_city: string
          destination_country?: string
          gp_id: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          origin_city: string
          origin_country?: string
          phone_secondary?: string | null
          updated_at?: string
        }
        Update: {
          address_destination?: string | null
          address_origin?: string | null
          created_at?: string
          destination_city?: string
          destination_country?: string
          gp_id?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          origin_city?: string
          origin_country?: string
          phone_secondary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_navettes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_navettes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
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
      gp_price_adjustment_history: {
        Row: {
          action: string
          created_at: string
          gp_id: string
          id: string
          new_price: number
          old_price: number
          toggles_remaining: number
        }
        Insert: {
          action: string
          created_at?: string
          gp_id: string
          id?: string
          new_price: number
          old_price: number
          toggles_remaining: number
        }
        Update: {
          action?: string
          created_at?: string
          gp_id?: string
          id?: string
          new_price?: number
          old_price?: number
          toggles_remaining?: number
        }
        Relationships: [
          {
            foreignKeyName: "gp_price_adjustment_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_price_adjustment_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_price_adjustments: {
        Row: {
          base_price_per_kg: number
          created_at: string
          gp_id: string
          haute_saison_price_per_kg: number
          id: string
          is_haute_saison: boolean
          last_toggled_at: string | null
          toggles_used_this_year: number
          updated_at: string
          year: number
        }
        Insert: {
          base_price_per_kg: number
          created_at?: string
          gp_id: string
          haute_saison_price_per_kg: number
          id?: string
          is_haute_saison?: boolean
          last_toggled_at?: string | null
          toggles_used_this_year?: number
          updated_at?: string
          year?: number
        }
        Update: {
          base_price_per_kg?: number
          created_at?: string
          gp_id?: string
          haute_saison_price_per_kg?: number
          id?: string
          is_haute_saison?: boolean
          last_toggled_at?: string | null
          toggles_used_this_year?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "gp_price_adjustments_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_price_adjustments_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "public_gp_profiles"
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
          auto_accept_enabled: boolean | null
          auto_accept_exclude_fragile: boolean | null
          auto_accept_max_orders_per_day: number | null
          auto_accept_max_weight: number | null
          auto_accept_min_price: number | null
          auto_accept_require_insurance: boolean | null
          base_destination_city: string | null
          base_destination_country: string | null
          base_origin_city: string | null
          base_origin_country: string | null
          base_price_per_kg: number | null
          business_name: string
          business_registration_url: string | null
          city: string
          consecutive_no_responses: number | null
          country_code: string
          created_at: string
          default_currency: string | null
          deposit_address: string | null
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
          kyc_level: number
          kyc_status: string
          last_warning_at: string | null
          max_response_delay_hours: number | null
          navette_locked_at: string | null
          phone: string
          phone_secondary: string | null
          price_locked_at: string | null
          rating: number | null
          reception_address: string | null
          road_type: Database["public"]["Enums"]["road_type"] | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["gp_status"]
          subscription: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries: number | null
          total_reviews: number | null
          transport_license_url: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          whatsapp: string | null
          whatsapp_phone: string | null
          withdrawal_limit: number
          years_experience: number | null
          zones_covered: string[] | null
        }
        Insert: {
          address?: string | null
          auto_accept_enabled?: boolean | null
          auto_accept_exclude_fragile?: boolean | null
          auto_accept_max_orders_per_day?: number | null
          auto_accept_max_weight?: number | null
          auto_accept_min_price?: number | null
          auto_accept_require_insurance?: boolean | null
          base_destination_city?: string | null
          base_destination_country?: string | null
          base_origin_city?: string | null
          base_origin_country?: string | null
          base_price_per_kg?: number | null
          business_name: string
          business_registration_url?: string | null
          city: string
          consecutive_no_responses?: number | null
          country_code?: string
          created_at?: string
          default_currency?: string | null
          deposit_address?: string | null
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
          kyc_level?: number
          kyc_status?: string
          last_warning_at?: string | null
          max_response_delay_hours?: number | null
          navette_locked_at?: string | null
          phone: string
          phone_secondary?: string | null
          price_locked_at?: string | null
          rating?: number | null
          reception_address?: string | null
          road_type?: Database["public"]["Enums"]["road_type"] | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["gp_status"]
          subscription?: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries?: number | null
          total_reviews?: number | null
          transport_license_url?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          whatsapp?: string | null
          whatsapp_phone?: string | null
          withdrawal_limit?: number
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Update: {
          address?: string | null
          auto_accept_enabled?: boolean | null
          auto_accept_exclude_fragile?: boolean | null
          auto_accept_max_orders_per_day?: number | null
          auto_accept_max_weight?: number | null
          auto_accept_min_price?: number | null
          auto_accept_require_insurance?: boolean | null
          base_destination_city?: string | null
          base_destination_country?: string | null
          base_origin_city?: string | null
          base_origin_country?: string | null
          base_price_per_kg?: number | null
          business_name?: string
          business_registration_url?: string | null
          city?: string
          consecutive_no_responses?: number | null
          country_code?: string
          created_at?: string
          default_currency?: string | null
          deposit_address?: string | null
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
          kyc_level?: number
          kyc_status?: string
          last_warning_at?: string | null
          max_response_delay_hours?: number | null
          navette_locked_at?: string | null
          phone?: string
          phone_secondary?: string | null
          price_locked_at?: string | null
          rating?: number | null
          reception_address?: string | null
          road_type?: Database["public"]["Enums"]["road_type"] | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["gp_status"]
          subscription?: Database["public"]["Enums"]["gp_subscription"]
          total_deliveries?: number | null
          total_reviews?: number | null
          transport_license_url?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          whatsapp?: string | null
          whatsapp_phone?: string | null
          withdrawal_limit?: number
          years_experience?: number | null
          zones_covered?: string[] | null
        }
        Relationships: []
      }
      gp_response_tracking: {
        Row: {
          auto_cancelled_at: string | null
          created_at: string
          deadline_at: string
          gp_id: string
          id: string
          order_id: string
          responded_at: string | null
          warning_sent_at: string | null
        }
        Insert: {
          auto_cancelled_at?: string | null
          created_at?: string
          deadline_at: string
          gp_id: string
          id?: string
          order_id: string
          responded_at?: string | null
          warning_sent_at?: string | null
        }
        Update: {
          auto_cancelled_at?: string | null
          created_at?: string
          deadline_at?: string
          gp_id?: string
          id?: string
          order_id?: string
          responded_at?: string | null
          warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gp_response_tracking_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_response_tracking_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_response_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "gp_response_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "gp_response_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_routes: {
        Row: {
          created_at: string
          currency: string | null
          default_price_per_kg: number | null
          destination_city: string
          destination_country: string
          gp_id: string
          id: string
          is_active: boolean
          origin_city: string
          origin_country: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          default_price_per_kg?: number | null
          destination_city: string
          destination_country: string
          gp_id: string
          id?: string
          is_active?: boolean
          origin_city: string
          origin_country: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          default_price_per_kg?: number | null
          destination_city?: string
          destination_country?: string
          gp_id?: string
          id?: string
          is_active?: boolean
          origin_city?: string
          origin_country?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_routes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_routes_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gp_wallets: {
        Row: {
          balance: number
          commission_due: number
          commission_rate: number
          created_at: string
          currency: string
          debt_balance: number
          gp_id: string
          id: string
          locked_balance: number
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          balance?: number
          commission_due?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          debt_balance?: number
          gp_id: string
          id?: string
          locked_balance?: number
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          commission_due?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          debt_balance?: number
          gp_id?: string
          id?: string
          locked_balance?: number
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
      gp_weight_tiers: {
        Row: {
          created_at: string
          currency: string
          gp_id: string
          id: string
          is_active: boolean | null
          max_weight: number
          min_weight: number
          price_per_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gp_id: string
          id?: string
          is_active?: boolean | null
          max_weight: number
          min_weight: number
          price_per_kg: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          gp_id?: string
          id?: string
          is_active?: boolean | null
          max_weight?: number
          min_weight?: number
          price_per_kg?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gp_weight_tiers_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gp_weight_tiers_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          action: string | null
          actor_id: string | null
          created_at: string
          expires_at: string | null
          key: string
          order_id: string | null
          result: Json | null
        }
        Insert: {
          action?: string | null
          actor_id?: string | null
          created_at?: string
          expires_at?: string | null
          key: string
          order_id?: string | null
          result?: Json | null
        }
        Update: {
          action?: string | null
          actor_id?: string | null
          created_at?: string
          expires_at?: string | null
          key?: string
          order_id?: string | null
          result?: Json | null
        }
        Relationships: []
      }
      insurance_tiers: {
        Row: {
          category: string
          created_at: string
          id: string
          insurance_fee: number
          is_active: boolean | null
          label: string
          max_declared_value: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          insurance_fee: number
          is_active?: boolean | null
          label: string
          max_declared_value: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          insurance_fee?: number
          is_active?: boolean | null
          label?: string
          max_declared_value?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      konnekt_ledger: {
        Row: {
          amount_display: number
          amount_fcfa: number
          created_at: string
          currency_display: string
          description: string | null
          gp_id: string | null
          id: string
          order_id: string | null
          reference: string | null
          status: string
          type: string
        }
        Insert: {
          amount_display?: number
          amount_fcfa: number
          created_at?: string
          currency_display?: string
          description?: string | null
          gp_id?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          type: string
        }
        Update: {
          amount_display?: number
          amount_fcfa?: number
          created_at?: string
          currency_display?: string
          description?: string | null
          gp_id?: string | null
          id?: string
          order_id?: string | null
          reference?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "konnekt_ledger_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "konnekt_ledger_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "konnekt_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "konnekt_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "konnekt_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ktp_history: {
        Row: {
          created_at: string
          gp_id: string
          id: string
          new_level: string
          new_trust_score: number
          old_level: string
          old_trust_score: number
          reason: string
          triggered_by: string
        }
        Insert: {
          created_at?: string
          gp_id: string
          id?: string
          new_level: string
          new_trust_score?: number
          old_level: string
          old_trust_score?: number
          reason: string
          triggered_by?: string
        }
        Update: {
          created_at?: string
          gp_id?: string
          id?: string
          new_level?: string
          new_trust_score?: number
          old_level?: string
          old_trust_score?: number
          reason?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ktp_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ktp_history_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ktp_status: {
        Row: {
          client_satisfaction_score: number
          commission_rate: number
          created_at: string
          delivery_history_score: number
          delivery_punctuality_score: number
          gp_id: string
          id: string
          insurance_coefficient: number
          ktp_level: string
          last_evaluated_at: string
          payment_release_rule: string
          platform_discipline_score: number
          scan_compliance_score: number
          suspended_at: string | null
          suspension_reason: string | null
          total_deliveries_evaluated: number
          total_expected_scans: number
          total_on_time_deliveries: number
          total_scans: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          client_satisfaction_score?: number
          commission_rate?: number
          created_at?: string
          delivery_history_score?: number
          delivery_punctuality_score?: number
          gp_id: string
          id?: string
          insurance_coefficient?: number
          ktp_level?: string
          last_evaluated_at?: string
          payment_release_rule?: string
          platform_discipline_score?: number
          scan_compliance_score?: number
          suspended_at?: string | null
          suspension_reason?: string | null
          total_deliveries_evaluated?: number
          total_expected_scans?: number
          total_on_time_deliveries?: number
          total_scans?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          client_satisfaction_score?: number
          commission_rate?: number
          created_at?: string
          delivery_history_score?: number
          delivery_punctuality_score?: number
          gp_id?: string
          id?: string
          insurance_coefficient?: number
          ktp_level?: string
          last_evaluated_at?: string
          payment_release_rule?: string
          platform_discipline_score?: number
          scan_compliance_score?: number
          suspended_at?: string | null
          suspension_reason?: string | null
          total_deliveries_evaluated?: number
          total_expected_scans?: number
          total_on_time_deliveries?: number
          total_scans?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ktp_status_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ktp_status_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: true
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_pricing_config: {
        Row: {
          base_price: number
          created_at: string
          currency: string
          fragile_surcharge: number
          id: string
          is_active: boolean
          service_type: string
          updated_at: string
          weight_surcharge_per_kg: number
          weight_threshold_kg: number
          zone: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          currency?: string
          fragile_surcharge?: number
          id?: string
          is_active?: boolean
          service_type: string
          updated_at?: string
          weight_surcharge_per_kg?: number
          weight_threshold_kg?: number
          zone?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          currency?: string
          fragile_surcharge?: number
          id?: string
          is_active?: boolean
          service_type?: string
          updated_at?: string
          weight_surcharge_per_kg?: number
          weight_threshold_kg?: number
          zone?: string
        }
        Relationships: []
      }
      logistics_status_history: {
        Row: {
          action: string
          actor_id: string
          actor_type: string
          created_at: string
          id: string
          location: string | null
          logistics_option_id: string | null
          new_status: string | null
          notes: string | null
          old_status: string | null
          order_id: string
          scan_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: string
          created_at?: string
          id?: string
          location?: string | null
          logistics_option_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          order_id: string
          scan_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: string
          created_at?: string
          id?: string
          location?: string | null
          logistics_option_id?: string | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          order_id?: string
          scan_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_status_history_logistics_option_id_fkey"
            columns: ["logistics_option_id"]
            isOneToOne: false
            referencedRelation: "order_logistics_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "logistics_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "logistics_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points_history: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "loyalty_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "loyalty_points_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tier_notifications: {
        Row: {
          id: string
          notification_type: string
          sent_at: string
          tier_id: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          sent_at?: string
          tier_id: string
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          sent_at?: string
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tier_notifications_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          created_at: string
          discount_percent: number
          id: string
          min_orders: number
          min_spent: number
          name: string
          perks: string[] | null
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          discount_percent?: number
          id?: string
          min_orders?: number
          min_spent?: number
          name: string
          perks?: string[] | null
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          discount_percent?: number
          id?: string
          min_orders?: number
          min_spent?: number
          name?: string
          perks?: string[] | null
        }
        Relationships: []
      }
      manual_parcels: {
        Row: {
          amount_paid: number
          client_name: string
          client_phone: string
          commission_amount: number
          commission_deducted: boolean
          created_at: string
          currency: string
          declared_value: number | null
          destination_city: string
          gp_id: string
          id: string
          is_manual: boolean
          notes: string | null
          order_number: string
          origin_city: string
          parcel_type: string
          payment_mode: string
          status: string
          updated_at: string
          weight: number
        }
        Insert: {
          amount_paid?: number
          client_name: string
          client_phone: string
          commission_amount?: number
          commission_deducted?: boolean
          created_at?: string
          currency?: string
          declared_value?: number | null
          destination_city: string
          gp_id: string
          id?: string
          is_manual?: boolean
          notes?: string | null
          order_number?: string
          origin_city: string
          parcel_type?: string
          payment_mode?: string
          status?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          amount_paid?: number
          client_name?: string
          client_phone?: string
          commission_amount?: number
          commission_deducted?: boolean
          created_at?: string
          currency?: string
          declared_value?: number | null
          destination_city?: string
          gp_id?: string
          id?: string
          is_manual?: boolean
          notes?: string | null
          order_number?: string
          origin_city?: string
          parcel_type?: string
          payment_mode?: string
          status?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "manual_parcels_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_parcels_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          sender_type: string
          sort_order: number | null
          template_key: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sender_type: string
          sort_order?: number | null
          template_key: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sender_type?: string
          sort_order?: number | null
          template_key?: string
        }
        Relationships: []
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
      mission_negotiation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          negotiation_id: string
          offer_price: number | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          negotiation_id: string
          offer_price?: number | null
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          negotiation_id?: string
          offer_price?: number | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_negotiation_events_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "mission_negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_negotiations: {
        Row: {
          agreed_price: number | null
          client_final_price: number | null
          client_message: string | null
          client_responded_at: string | null
          created_at: string
          deadline_at: string | null
          estimated_delivery: string | null
          gp_counter_price: number | null
          gp_id: string
          gp_message: string | null
          gp_responded_at: string | null
          id: string
          initial_client_price: number
          mission_id: string
          status: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          agreed_price?: number | null
          client_final_price?: number | null
          client_message?: string | null
          client_responded_at?: string | null
          created_at?: string
          deadline_at?: string | null
          estimated_delivery?: string | null
          gp_counter_price?: number | null
          gp_id: string
          gp_message?: string | null
          gp_responded_at?: string | null
          id?: string
          initial_client_price: number
          mission_id: string
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          agreed_price?: number | null
          client_final_price?: number | null
          client_message?: string | null
          client_responded_at?: string | null
          created_at?: string
          deadline_at?: string | null
          estimated_delivery?: string | null
          gp_counter_price?: number | null
          gp_id?: string
          gp_message?: string | null
          gp_responded_at?: string | null
          id?: string
          initial_client_price?: number
          mission_id?: string
          status?: Database["public"]["Enums"]["negotiation_status"] | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_negotiations_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_negotiations_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_negotiations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "routier_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_negotiations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_logistics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_logistics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_logistics_options: {
        Row: {
          created_at: string
          currency: string
          delivery_address: string | null
          delivery_city: string | null
          delivery_completed_at: string | null
          delivery_contact_name: string | null
          delivery_enabled: boolean
          delivery_instructions: string | null
          delivery_phone: string | null
          delivery_price: number | null
          delivery_scheduled_at: string | null
          delivery_status: string | null
          delivery_whatsapp: string | null
          gp_arrived_at: string | null
          id: string
          logistics_status: string | null
          order_id: string
          pickup_address: string | null
          pickup_city: string | null
          pickup_collected_at: string | null
          pickup_contact_name: string | null
          pickup_enabled: boolean
          pickup_handed_at: string | null
          pickup_phone: string | null
          pickup_price: number | null
          pickup_status: string | null
          pickup_time_slot: string | null
          pickup_whatsapp: string | null
          terms_accepted_at: string | null
          total_logistics_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_completed_at?: string | null
          delivery_contact_name?: string | null
          delivery_enabled?: boolean
          delivery_instructions?: string | null
          delivery_phone?: string | null
          delivery_price?: number | null
          delivery_scheduled_at?: string | null
          delivery_status?: string | null
          delivery_whatsapp?: string | null
          gp_arrived_at?: string | null
          id?: string
          logistics_status?: string | null
          order_id: string
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_collected_at?: string | null
          pickup_contact_name?: string | null
          pickup_enabled?: boolean
          pickup_handed_at?: string | null
          pickup_phone?: string | null
          pickup_price?: number | null
          pickup_status?: string | null
          pickup_time_slot?: string | null
          pickup_whatsapp?: string | null
          terms_accepted_at?: string | null
          total_logistics_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_completed_at?: string | null
          delivery_contact_name?: string | null
          delivery_enabled?: boolean
          delivery_instructions?: string | null
          delivery_phone?: string | null
          delivery_price?: number | null
          delivery_scheduled_at?: string | null
          delivery_status?: string | null
          delivery_whatsapp?: string | null
          gp_arrived_at?: string | null
          id?: string
          logistics_status?: string | null
          order_id?: string
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_collected_at?: string | null
          pickup_contact_name?: string | null
          pickup_enabled?: boolean
          pickup_handed_at?: string | null
          pickup_phone?: string | null
          pickup_price?: number | null
          pickup_status?: string | null
          pickup_time_slot?: string | null
          pickup_whatsapp?: string | null
          terms_accepted_at?: string | null
          total_logistics_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_logistics_options_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_logistics_options_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_logistics_options_order_id_fkey"
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
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
          adjustment_amount: number | null
          client_disclaimer_accepted_at: string | null
          client_id: string
          commission_amount: number
          content_nature: string[] | null
          content_nature_other: string | null
          created_at: string
          currency: string
          declared_value: number | null
          declared_weight: number | null
          delivery_attempt_count: number
          delivery_blocked_until: string | null
          delivery_code: string | null
          delivery_confirmed_at: string | null
          delivery_confirmed_by_phone: string | null
          delivery_date: string | null
          description: string | null
          destination_city: string
          destination_country: string
          dimensions: string | null
          escrow_id: string | null
          final_amount: number | null
          financial_status:
            | Database["public"]["Enums"]["financial_status"]
            | null
          flat_rate_items: Json | null
          geo_suspicious: boolean
          gp_id: string
          gp_response_deadline: string | null
          has_insurance: boolean | null
          id: string
          insurance_amount: number | null
          insurance_tier_id: string | null
          logistics_status: string
          offer_id: string | null
          order_number: string
          origin_city: string
          origin_country: string
          payment_status: string | null
          pickup_date: string | null
          price_per_kg: number
          recipient_name: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          routier_mission_id: string | null
          security_flags: string[] | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_code: string | null
          updated_at: string
          weight: number
          weight_adjustment_count: number
          weight_tier_applied: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          adjustment_amount?: number | null
          client_disclaimer_accepted_at?: string | null
          client_id: string
          commission_amount?: number
          content_nature?: string[] | null
          content_nature_other?: string | null
          created_at?: string
          currency?: string
          declared_value?: number | null
          declared_weight?: number | null
          delivery_attempt_count?: number
          delivery_blocked_until?: string | null
          delivery_code?: string | null
          delivery_confirmed_at?: string | null
          delivery_confirmed_by_phone?: string | null
          delivery_date?: string | null
          description?: string | null
          destination_city: string
          destination_country: string
          dimensions?: string | null
          escrow_id?: string | null
          final_amount?: number | null
          financial_status?:
            | Database["public"]["Enums"]["financial_status"]
            | null
          flat_rate_items?: Json | null
          geo_suspicious?: boolean
          gp_id: string
          gp_response_deadline?: string | null
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          insurance_tier_id?: string | null
          logistics_status?: string
          offer_id?: string | null
          order_number: string
          origin_city: string
          origin_country: string
          payment_status?: string | null
          pickup_date?: string | null
          price_per_kg: number
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          routier_mission_id?: string | null
          security_flags?: string[] | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          tracking_code?: string | null
          updated_at?: string
          weight: number
          weight_adjustment_count?: number
          weight_tier_applied?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          adjustment_amount?: number | null
          client_disclaimer_accepted_at?: string | null
          client_id?: string
          commission_amount?: number
          content_nature?: string[] | null
          content_nature_other?: string | null
          created_at?: string
          currency?: string
          declared_value?: number | null
          declared_weight?: number | null
          delivery_attempt_count?: number
          delivery_blocked_until?: string | null
          delivery_code?: string | null
          delivery_confirmed_at?: string | null
          delivery_confirmed_by_phone?: string | null
          delivery_date?: string | null
          description?: string | null
          destination_city?: string
          destination_country?: string
          dimensions?: string | null
          escrow_id?: string | null
          final_amount?: number | null
          financial_status?:
            | Database["public"]["Enums"]["financial_status"]
            | null
          flat_rate_items?: Json | null
          geo_suspicious?: boolean
          gp_id?: string
          gp_response_deadline?: string | null
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          insurance_tier_id?: string | null
          logistics_status?: string
          offer_id?: string | null
          order_number?: string
          origin_city?: string
          origin_country?: string
          payment_status?: string | null
          pickup_date?: string | null
          price_per_kg?: number
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          routier_mission_id?: string | null
          security_flags?: string[] | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          tracking_code?: string | null
          updated_at?: string
          weight?: number
          weight_adjustment_count?: number
          weight_tier_applied?: string | null
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
            foreignKeyName: "orders_insurance_tier_id_fkey"
            columns: ["insurance_tier_id"]
            isOneToOne: false
            referencedRelation: "insurance_tiers"
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
      platform_wallet: {
        Row: {
          currency: string
          id: string
          total_commission: number
          total_escrow_held: number
          updated_at: string
        }
        Insert: {
          currency?: string
          id?: string
          total_commission?: number
          total_escrow_held?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          id?: string
          total_commission?: number
          total_escrow_held?: number
          updated_at?: string
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
          cumulative_spent: number
          email: string | null
          full_name: string | null
          id: string
          id_document_url: string | null
          is_gp: boolean | null
          kyc_level: number
          kyc_verified_at: string | null
          phone: string | null
          postal_code: string | null
          residence_city: string | null
          selfie_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          cumulative_spent?: number
          email?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          is_gp?: boolean | null
          kyc_level?: number
          kyc_verified_at?: string | null
          phone?: string | null
          postal_code?: string | null
          residence_city?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          cumulative_spent?: number
          email?: string | null
          full_name?: string | null
          id?: string
          id_document_url?: string | null
          is_gp?: boolean | null
          kyc_level?: number
          kyc_verified_at?: string | null
          phone?: string | null
          postal_code?: string | null
          residence_city?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipient_requests: {
        Row: {
          created_at: string | null
          id: string
          requester_id: string
          requester_name: string | null
          status: string
          target_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          requester_id: string
          requester_name?: string | null
          status?: string
          target_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          requester_id?: string
          requester_name?: string | null
          status?: string
          target_user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recipients: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_favorite: boolean | null
          nickname: string | null
          owner_id: string
          phone: string | null
          recipient_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_favorite?: boolean | null
          nickname?: string | null
          owner_id: string
          phone?: string | null
          recipient_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_favorite?: boolean | null
          nickname?: string | null
          owner_id?: string
          phone?: string | null
          recipient_user_id?: string | null
          updated_at?: string | null
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
          criteria_communication: boolean | null
          criteria_condition: boolean | null
          criteria_packaging: boolean | null
          criteria_professionalism: boolean | null
          criteria_punctuality: boolean | null
          gp_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          criteria_communication?: boolean | null
          criteria_condition?: boolean | null
          criteria_packaging?: boolean | null
          criteria_professionalism?: boolean | null
          criteria_punctuality?: boolean | null
          gp_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          criteria_communication?: boolean | null
          criteria_condition?: boolean | null
          criteria_packaging?: boolean | null
          criteria_professionalism?: boolean | null
          criteria_punctuality?: boolean | null
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
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
      routier_missions: {
        Row: {
          accepted_negotiation_id: string | null
          accepted_order_id: string | null
          client_budget: number | null
          client_id: string
          constraints: string[] | null
          created_at: string
          currency: string | null
          delivery_to_door: boolean | null
          destination_address: string | null
          destination_city: string
          destination_country: string
          estimated_distance_km: number | null
          estimated_price: number | null
          expires_at: string | null
          freight_type: string
          id: string
          matched_gp_id: string | null
          merchandise_description: string | null
          mission_number: string
          origin_address: string | null
          origin_city: string
          origin_country: string
          pickup_date_end: string | null
          pickup_date_start: string
          status: string
          updated_at: string
          urgency: Database["public"]["Enums"]["mission_urgency"] | null
          vehicle_type_required: string | null
          volume_estimate: string | null
          weight_kg: number
        }
        Insert: {
          accepted_negotiation_id?: string | null
          accepted_order_id?: string | null
          client_budget?: number | null
          client_id: string
          constraints?: string[] | null
          created_at?: string
          currency?: string | null
          delivery_to_door?: boolean | null
          destination_address?: string | null
          destination_city: string
          destination_country?: string
          estimated_distance_km?: number | null
          estimated_price?: number | null
          expires_at?: string | null
          freight_type: string
          id?: string
          matched_gp_id?: string | null
          merchandise_description?: string | null
          mission_number: string
          origin_address?: string | null
          origin_city: string
          origin_country?: string
          pickup_date_end?: string | null
          pickup_date_start: string
          status?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["mission_urgency"] | null
          vehicle_type_required?: string | null
          volume_estimate?: string | null
          weight_kg?: number
        }
        Update: {
          accepted_negotiation_id?: string | null
          accepted_order_id?: string | null
          client_budget?: number | null
          client_id?: string
          constraints?: string[] | null
          created_at?: string
          currency?: string | null
          delivery_to_door?: boolean | null
          destination_address?: string | null
          destination_city?: string
          destination_country?: string
          estimated_distance_km?: number | null
          estimated_price?: number | null
          expires_at?: string | null
          freight_type?: string
          id?: string
          matched_gp_id?: string | null
          merchandise_description?: string | null
          mission_number?: string
          origin_address?: string | null
          origin_city?: string
          origin_country?: string
          pickup_date_end?: string | null
          pickup_date_start?: string
          status?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["mission_urgency"] | null
          vehicle_type_required?: string | null
          volume_estimate?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_accepted_negotiation"
            columns: ["accepted_negotiation_id"]
            isOneToOne: false
            referencedRelation: "mission_negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routier_missions_accepted_order_id_fkey"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "routier_missions_accepted_order_id_fkey"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "routier_missions_accepted_order_id_fkey"
            columns: ["accepted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routier_missions_matched_gp_id_fkey"
            columns: ["matched_gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routier_missions_matched_gp_id_fkey"
            columns: ["matched_gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
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
      scan_logs: {
        Row: {
          action: string
          created_at: string
          device: string | null
          engine_status: string | null
          financial_impact: Json | null
          id: string
          idempotency_key: string | null
          ip: string | null
          metadata: Json | null
          new_status: string | null
          order_id: string | null
          previous_status: string | null
          qr_type: string | null
          reference_id: string | null
          scan_type: string
          signature_valid: boolean | null
          user_id: string
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          device?: string | null
          engine_status?: string | null
          financial_impact?: Json | null
          id?: string
          idempotency_key?: string | null
          ip?: string | null
          metadata?: Json | null
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          qr_type?: string | null
          reference_id?: string | null
          scan_type?: string
          signature_valid?: boolean | null
          user_id: string
          user_role: string
        }
        Update: {
          action?: string
          created_at?: string
          device?: string | null
          engine_status?: string | null
          financial_impact?: Json | null
          id?: string
          idempotency_key?: string | null
          ip?: string | null
          metadata?: Json | null
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          qr_type?: string | null
          reference_id?: string | null
          scan_type?: string
          signature_valid?: boolean | null
          user_id?: string
          user_role?: string
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
      security_audit_log: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          order_id: string | null
          severity: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          order_id?: string | null
          severity?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          order_id?: string | null
          severity?: string
        }
        Relationships: []
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          gp_id: string
          id: string
          invoice_number: string
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          plan: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          gp_id: string
          id?: string
          invoice_number: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          plan?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          gp_id?: string
          id?: string
          invoice_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          plan?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "tracking_issues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
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
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
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
      tva_records: {
        Row: {
          commission_amount_fcfa: number
          commission_ht_display: number
          commission_ht_fcfa: number
          created_at: string
          currency_display: string
          id: string
          order_id: string
          tva_amount_display: number
          tva_amount_fcfa: number
          tva_rate: number
        }
        Insert: {
          commission_amount_fcfa?: number
          commission_ht_display?: number
          commission_ht_fcfa?: number
          created_at?: string
          currency_display?: string
          id?: string
          order_id: string
          tva_amount_display?: number
          tva_amount_fcfa?: number
          tva_rate?: number
        }
        Update: {
          commission_amount_fcfa?: number
          commission_ht_display?: number
          commission_ht_fcfa?: number
          created_at?: string
          currency_display?: string
          id?: string
          order_id?: string
          tva_amount_display?: number
          tva_amount_fcfa?: number
          tva_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "tva_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "gp_contact_release"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "tva_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "mvp_coherence_dashboard"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "tva_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
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
      weight_adjustment_log: {
        Row: {
          actor_id: string
          actor_role: string
          block_reason: string | null
          blocked: boolean
          created_at: string
          declared_weight: number
          delta_amount: number
          id: string
          justification: string | null
          order_id: string
          original_weight: number
        }
        Insert: {
          actor_id: string
          actor_role: string
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          declared_weight: number
          delta_amount?: number
          id?: string
          justification?: string | null
          order_id: string
          original_weight: number
        }
        Update: {
          actor_id?: string
          actor_role?: string
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          declared_weight?: number
          delta_amount?: number
          id?: string
          justification?: string | null
          order_id?: string
          original_weight?: number
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount_display: number
          amount_fcfa: number
          created_at: string
          currency_display: string
          gp_id: string
          id: string
          method: string
          phone_or_account: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount_display?: number
          amount_fcfa: number
          created_at?: string
          currency_display?: string
          gp_id: string
          id?: string
          method: string
          phone_or_account?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount_display?: number
          amount_fcfa?: number
          created_at?: string
          currency_display?: string
          gp_id?: string
          id?: string
          method?: string
          phone_or_account?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "gp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_gp_id_fkey"
            columns: ["gp_id"]
            isOneToOne: false
            referencedRelation: "public_gp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gp_contact_release: {
        Row: {
          business_name: string | null
          city: string | null
          client_id: string | null
          country_code: string | null
          default_currency: string | null
          deposit_address: string | null
          explicit_restrictions: string[] | null
          gp_id: string | null
          order_id: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_status: string | null
          phone_secondary: string | null
          rating: number | null
          reception_address: string | null
          verified_at: string | null
          whatsapp_number: string | null
        }
        Relationships: [
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
        ]
      }
      mvp_coherence_dashboard: {
        Row: {
          coherence_alert: string | null
          commission_amount: number | null
          delivery_attempt_count: number | null
          delivery_blocked_until: string | null
          escrow_amount: number | null
          escrow_status: string | null
          financial_status:
            | Database["public"]["Enums"]["financial_status"]
            | null
          geo_suspicious: boolean | null
          is_coherent: boolean | null
          net_to_gp: number | null
          order_id: string | null
          order_number: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          updated_at: string | null
        }
        Relationships: []
      }
      public_gp_profiles: {
        Row: {
          business_name: string | null
          city: string | null
          country_code: string | null
          created_at: string | null
          default_currency: string | null
          description: string | null
          explicit_restrictions: string[] | null
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
          default_currency?: string | null
          description?: string | null
          explicit_restrictions?: string[] | null
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
          default_currency?: string | null
          description?: string | null
          explicit_restrictions?: string[] | null
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
      public_user_profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          full_name?: string | null
          user_id?: string | null
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
      can_perform_scan_action: {
        Args: { p_action: string; p_order_id: string; p_user_role: string }
        Returns: boolean
      }
      check_loyalty_tier_progress: {
        Args: { p_user_id: string }
        Returns: {
          notification_type: string
          progress_percent: number
          tier_name: string
        }[]
      }
      convert_mission_to_order: {
        Args: { p_agreed_price: number; p_gp_id: string; p_mission_id: string }
        Returns: string
      }
      create_default_weight_tiers: {
        Args: { p_currency?: string; p_gp_id: string }
        Returns: undefined
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
      evaluate_ktp_level: { Args: { p_trust_score: number }; Returns: string }
      get_ktp_commission_rate: {
        Args: { p_trust_score: number }
        Returns: number
      }
      get_ktp_insurance_coefficient: {
        Args: { p_trust_score: number }
        Returns: number
      }
      get_ktp_payment_rule: { Args: { p_trust_score: number }; Returns: string }
      get_max_navettes: { Args: { p_subscription: string }; Returns: number }
      get_premium_commission_discount: {
        Args: { p_subscription: string }
        Returns: number
      }
      get_progressive_commission_rate: {
        Args: { p_total_deliveries: number }
        Returns: number
      }
      get_public_tracking: {
        Args: { p_order_identifier: string }
        Returns: Json
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
      is_mission_negotiation_participant: {
        Args: { _negotiation_id: string }
        Returns: boolean
      }
      is_order_gp: { Args: { order_gp_id: string }; Returns: boolean }
      is_valid_state_transition: {
        Args: { p_current_status: string; p_target_status: string }
        Returns: boolean
      }
      log_delivery_attempt_failed: {
        Args: {
          p_actor_id: string
          p_attempt_count: number
          p_order_id: string
        }
        Returns: undefined
      }
      owns_gp_offer: { Args: { offer_gp_id: string }; Returns: boolean }
      owns_gp_wallet: { Args: { wallet_gp_id: string }; Returns: boolean }
      process_gp_response_deadlines: { Args: never; Returns: Json }
      remove_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "agent_logistique"
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
      financial_status:
        | "pending_payment"
        | "escrow_locked"
        | "adjustment_required"
        | "adjustment_paid"
        | "completed"
        | "cancelled"
        | "refunded"
      gp_status:
        | "starter"
        | "pending"
        | "verified"
        | "premium"
        | "suspended"
        | "rejected"
      gp_subscription: "free" | "premium" | "pro"
      gp_type:
        | "express"
        | "routier"
        | "maritime"
        | "aerien"
        | "voyageur"
        | "agence"
        | "bagages_international"
      mission_urgency: "standard" | "express" | "immediate"
      negotiation_status:
        | "pending"
        | "counter_proposed"
        | "accepted"
        | "rejected"
        | "expired"
      offer_status: "active" | "paused" | "expired" | "completed"
      order_status:
        | "pending"
        | "accepted"
        | "collected"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "disputed"
        | "paid_held"
        | "checked_in"
        | "weight_pending_payment"
        | "scheduled_departure"
        | "arrived_destination"
        | "delivery_pending"
        | "delivery_confirmed"
        | "released"
      reputation_status:
        | "verified"
        | "under_observation"
        | "suspended"
        | "excluded"
      road_type: "shuttle" | "mission"
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
        | "order_payment"
        | "manual_commission"
        | "release"
        | "insurance_hold"
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
      app_role: ["admin", "moderator", "user", "agent_logistique"],
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
      financial_status: [
        "pending_payment",
        "escrow_locked",
        "adjustment_required",
        "adjustment_paid",
        "completed",
        "cancelled",
        "refunded",
      ],
      gp_status: [
        "starter",
        "pending",
        "verified",
        "premium",
        "suspended",
        "rejected",
      ],
      gp_subscription: ["free", "premium", "pro"],
      gp_type: [
        "express",
        "routier",
        "maritime",
        "aerien",
        "voyageur",
        "agence",
        "bagages_international",
      ],
      mission_urgency: ["standard", "express", "immediate"],
      negotiation_status: [
        "pending",
        "counter_proposed",
        "accepted",
        "rejected",
        "expired",
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
        "paid_held",
        "checked_in",
        "weight_pending_payment",
        "scheduled_departure",
        "arrived_destination",
        "delivery_pending",
        "delivery_confirmed",
        "released",
      ],
      reputation_status: [
        "verified",
        "under_observation",
        "suspended",
        "excluded",
      ],
      road_type: ["shuttle", "mission"],
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
        "order_payment",
        "manual_commission",
        "release",
        "insurance_hold",
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
