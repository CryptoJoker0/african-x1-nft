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
      collection_config: {
        Row: {
          collection_name: string
          id: number
          max_per_wallet: number
          max_supply: number
          mint_paused: boolean
          mint_price: number
          pre_reveal_image_url: string | null
          program_id: string | null
          revealed: boolean
          rpc_url: string
          symbol: string
          treasury_wallet: string | null
          updated_at: string
          whitelist_only: boolean
        }
        Insert: {
          collection_name?: string
          id?: number
          max_per_wallet?: number
          max_supply?: number
          mint_paused?: boolean
          mint_price?: number
          pre_reveal_image_url?: string | null
          program_id?: string | null
          revealed?: boolean
          rpc_url?: string
          symbol?: string
          treasury_wallet?: string | null
          updated_at?: string
          whitelist_only?: boolean
        }
        Update: {
          collection_name?: string
          id?: number
          max_per_wallet?: number
          max_supply?: number
          mint_paused?: boolean
          mint_price?: number
          pre_reveal_image_url?: string | null
          program_id?: string | null
          revealed?: boolean
          rpc_url?: string
          symbol?: string
          treasury_wallet?: string | null
          updated_at?: string
          whitelist_only?: boolean
        }
        Relationships: []
      }
      nfts: {
        Row: {
          animation_url: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          mint_signature: string | null
          minted_at: string | null
          name: string
          owner_user_id: string | null
          owner_wallet: string | null
          rarity: Database["public"]["Enums"]["nft_rarity"]
          status: Database["public"]["Enums"]["nft_status"]
          token_id: number
          traits: Json
        }
        Insert: {
          animation_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          mint_signature?: string | null
          minted_at?: string | null
          name: string
          owner_user_id?: string | null
          owner_wallet?: string | null
          rarity?: Database["public"]["Enums"]["nft_rarity"]
          status?: Database["public"]["Enums"]["nft_status"]
          token_id: number
          traits?: Json
        }
        Update: {
          animation_url?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          mint_signature?: string | null
          minted_at?: string | null
          name?: string
          owner_user_id?: string | null
          owner_wallet?: string | null
          rarity?: Database["public"]["Enums"]["nft_rarity"]
          status?: Database["public"]["Enums"]["nft_status"]
          token_id?: number
          traits?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          confirmed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          nft_id: string | null
          signature: string | null
          status: Database["public"]["Enums"]["tx_status"]
          tx_type: Database["public"]["Enums"]["tx_type"]
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          nft_id?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tx_type: Database["public"]["Enums"]["tx_type"]
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          nft_id?: string | null
          signature?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tx_type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
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
      whitelist: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          note: string | null
          wallet_address: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          wallet_address: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      app_role: "admin" | "user"
      nft_rarity: "legendary" | "elite" | "rare" | "uncommon" | "common"
      nft_status: "available" | "reserved" | "minted"
      tx_status: "pending" | "confirmed" | "failed"
      tx_type: "mint" | "transfer" | "reveal"
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
      app_role: ["admin", "user"],
      nft_rarity: ["legendary", "elite", "rare", "uncommon", "common"],
      nft_status: ["available", "reserved", "minted"],
      tx_status: ["pending", "confirmed", "failed"],
      tx_type: ["mint", "transfer", "reveal"],
    },
  },
} as const
