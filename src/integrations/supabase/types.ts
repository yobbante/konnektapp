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
      gp_offers: {
        Row: {
          arrival_date: string | null
          available_capacity: number
          bookings_count: number | null
          conditions: string | null
          created_at: string
          currency: string
          departure_date: string
          description: string | null
          destination_city: string
          destination_country: string
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
          views_count: number | null
        }
        Insert: {
          arrival_date?: string | null
          available_capacity: number
          bookings_count?: number | null
          conditions?: string | null
          created_at?: string
          currency?: string
          departure_date: string
          description?: string | null
          destination_city: string
          destination_country: string
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
          views_count?: number | null
        }
        Update: {
          arrival_date?: string | null
          available_capacity?: number
          bookings_count?: number | null
          conditions?: string | null
          created_at?: string
          currency?: string
          departure_date?: string
          description?: string | null
          destination_city?: string
          destination_country?: string
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
          gp_id: string
          has_insurance: boolean | null
          id: string
          insurance_amount: number | null
          logistics_status: string
          offer_id: string | null
          order_number: string
          origin_city: string
          origin_country: string
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
          gp_id: string
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          logistics_status?: string
          offer_id?: string | null
          order_number: string
          origin_city: string
          origin_country: string
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
          gp_id?: string
          has_insurance?: boolean | null
          id?: string
          insurance_amount?: number | null
          logistics_status?: string
          offer_id?: string | null
          order_number?: string
          origin_city?: string
          origin_country?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      gp_status: "pending" | "verified" | "suspended" | "rejected"
      gp_subscription: "free" | "premium"
      gp_type:
        | "express"
        | "routier"
        | "maritime"
        | "aerien"
        | "voyageur"
        | "agence"
      offer_status: "active" | "paused" | "expired" | "completed"
      order_status:
        | "pending"
        | "accepted"
        | "collected"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "disputed"
      transaction_type:
        | "earning"
        | "withdrawal"
        | "commission"
        | "refund"
        | "bonus"
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
      gp_status: ["pending", "verified", "suspended", "rejected"],
      gp_subscription: ["free", "premium"],
      gp_type: [
        "express",
        "routier",
        "maritime",
        "aerien",
        "voyageur",
        "agence",
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
      transaction_type: [
        "earning",
        "withdrawal",
        "commission",
        "refund",
        "bonus",
      ],
    },
  },
} as const
