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
      admin_users: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      car_features: {
        Row: {
          car_id: string
          feature_name: string
          id: string
        }
        Insert: {
          car_id: string
          feature_name: string
          id?: string
        }
        Update: {
          car_id?: string
          feature_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_features_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_images: {
        Row: {
          car_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          car_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          car_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_images_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"]
          brand_id: string
          color: string | null
          created_at: string
          description: string | null
          engine_cc: number | null
          featured: boolean
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          is_sample: boolean
          kms_driven: number
          model_id: string
          original_price: number | null
          owners: number
          price: number
          published_at: string | null
          registration_city: string | null
          registration_state: string | null
          slug: string
          sold_at: string | null
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission"]
          updated_at: string
          variant: string | null
          year: number
        }
        Insert: {
          body_type: Database["public"]["Enums"]["body_type"]
          brand_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          engine_cc?: number | null
          featured?: boolean
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_sample?: boolean
          kms_driven: number
          model_id: string
          original_price?: number | null
          owners?: number
          price: number
          published_at?: string | null
          registration_city?: string | null
          registration_state?: string | null
          slug: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission"]
          updated_at?: string
          variant?: string | null
          year: number
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"]
          brand_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          engine_cc?: number | null
          featured?: boolean
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          is_sample?: boolean
          kms_driven?: number
          model_id?: string
          original_price?: number | null
          owners?: number
          price?: number
          published_at?: string | null
          registration_city?: string | null
          registration_state?: string | null
          slug?: string
          sold_at?: string | null
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission"]
          updated_at?: string
          variant?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_model_id_brand_id_fkey"
            columns: ["model_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      homepage_content: {
        Row: {
          cta_link: string | null
          cta_text: string | null
          hero_description: string | null
          hero_media_type: string | null
          hero_media_url: string | null
          hero_title: string
          id: number
          updated_at: string
          video_url: string | null
          why_us: Json
        }
        Insert: {
          cta_link?: string | null
          cta_text?: string | null
          hero_description?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          hero_title: string
          id?: number
          updated_at?: string
          video_url?: string | null
          why_us?: Json
        }
        Update: {
          cta_link?: string | null
          cta_text?: string | null
          hero_description?: string | null
          hero_media_type?: string | null
          hero_media_url?: string | null
          hero_title?: string
          id?: number
          updated_at?: string
          video_url?: string | null
          why_us?: Json
        }
        Relationships: []
      }
      leads: {
        Row: {
          car_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          notes: string | null
          phone: string
          preferred_time: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          car_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          notes?: string | null
          phone: string
          preferred_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          car_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string
          preferred_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          address: string | null
          business_hours: string | null
          dealership_name: string
          id: number
          logo_url: string | null
          map_url: string | null
          phone: string | null
          socials: Json
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          dealership_name: string
          id?: number
          logo_url?: string | null
          map_url?: string | null
          phone?: string | null
          socials?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          dealership_name?: string
          id?: number
          logo_url?: string | null
          map_url?: string | null
          phone?: string | null
          socials?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          customer_image: string | null
          customer_name: string
          id: string
          is_published: boolean
          rating: number
          review: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_image?: string | null
          customer_name: string
          id?: string
          is_published?: boolean
          rating: number
          review: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_image?: string | null
          customer_name?: string
          id?: string
          is_published?: boolean
          rating?: number
          review?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      save_car: {
        Args: {
          p_car: Json
          p_car_id: string
          p_features: string[]
          p_photo_base_url: string
          p_photos: string[]
        }
        Returns: string[]
      }
    }
    Enums: {
      body_type:
        | "hatchback"
        | "sedan"
        | "suv"
        | "muv"
        | "coupe"
        | "convertible"
        | "luxury"
      car_status: "draft" | "published" | "reserved" | "sold" | "archived"
      fuel_type: "petrol" | "diesel" | "cng" | "electric" | "hybrid"
      lead_status:
        | "new"
        | "contacted"
        | "test_drive"
        | "negotiation"
        | "closed"
        | "lost"
      transmission:
        | "manual"
        | "automatic"
        | "amt"
        | "cvt"
        | "dct"
        | "torque_converter"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      body_type: [
        "hatchback",
        "sedan",
        "suv",
        "muv",
        "coupe",
        "convertible",
        "luxury",
      ],
      car_status: ["draft", "published", "reserved", "sold", "archived"],
      fuel_type: ["petrol", "diesel", "cng", "electric", "hybrid"],
      lead_status: [
        "new",
        "contacted",
        "test_drive",
        "negotiation",
        "closed",
        "lost",
      ],
      transmission: [
        "manual",
        "automatic",
        "amt",
        "cvt",
        "dct",
        "torque_converter",
      ],
    },
  },
} as const
