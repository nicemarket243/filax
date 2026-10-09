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
      account_security: {
        Row: {
          account_id: string
          pin_hash: string
        }
        Insert: {
          account_id: string
          pin_hash: string
        }
        Update: {
          account_id?: string
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_security_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          balance: number
          created_at: string
          currency: string
          has_dedicated_pin: boolean
          id: string
          kind: string
          locked_until: string | null
          name: string
          parent_account_id: string | null
          status: string
          target: number | null
          user_id: string
          visual_key: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          has_dedicated_pin?: boolean
          id?: string
          kind?: string
          locked_until?: string | null
          name: string
          parent_account_id?: string | null
          status?: string
          target?: number | null
          user_id: string
          visual_key?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          has_dedicated_pin?: boolean
          id?: string
          kind?: string
          locked_until?: string | null
          name?: string
          parent_account_id?: string | null
          status?: string
          target?: number | null
          user_id?: string
          visual_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string
          created_at: string
          currency: string
          deadline: string | null
          icon: string
          id: string
          name: string
          saved: number
          target: number
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          currency?: string
          deadline?: string | null
          icon?: string
          id?: string
          name: string
          saved?: number
          target: number
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          icon?: string
          id?: string
          name?: string
          saved?: number
          target?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_contributions: {
        Row: {
          amount: number
          contributor_name: string | null
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          contributor_name?: string | null
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          contributor_name?: string | null
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_withdrawals: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          decided_at: string | null
          group_id: string
          id: string
          reason: string | null
          requested_by: string
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          decided_at?: string | null
          group_id: string
          id?: string
          reason?: string | null
          requested_by: string
          status?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          decided_at?: string | null
          group_id?: string
          id?: string
          reason?: string | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_withdrawals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_withdrawals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: string
          collected: number
          created_at: string
          currency: string
          deadline: string | null
          id: string
          name: string
          owner_id: string
          target: number | null
        }
        Insert: {
          category?: string
          collected?: number
          created_at?: string
          currency?: string
          deadline?: string | null
          id?: string
          name: string
          owner_id: string
          target?: number | null
        }
        Update: {
          category?: string
          collected?: number
          created_at?: string
          currency?: string
          deadline?: string | null
          id?: string
          name?: string
          owner_id?: string
          target?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_fees: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_city: string | null
          birth_date: string | null
          country: string | null
          created_at: string
          email: string | null
          filax_id: string | null
          first_name: string | null
          id: string
          id_document_path: string | null
          id_document_type: string | null
          kyc_status: string
          kyc_validated_at: string | null
          last_name: string | null
          partner_bank: string | null
          partner_subaccount: string | null
          phone: string | null
          selfie_path: string | null
          two_factor: boolean
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          birth_city?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          filax_id?: string | null
          first_name?: string | null
          id?: string
          id_document_path?: string | null
          id_document_type?: string | null
          kyc_status?: string
          kyc_validated_at?: string | null
          last_name?: string | null
          partner_bank?: string | null
          partner_subaccount?: string | null
          phone?: string | null
          selfie_path?: string | null
          two_factor?: boolean
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          birth_city?: string | null
          birth_date?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          filax_id?: string | null
          first_name?: string | null
          id?: string
          id_document_path?: string | null
          id_document_type?: string | null
          kyc_status?: string
          kyc_validated_at?: string | null
          last_name?: string | null
          partner_bank?: string | null
          partner_subaccount?: string | null
          phone?: string | null
          selfie_path?: string | null
          two_factor?: boolean
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          counterparty: string | null
          created_at: string
          fee: number
          id: string
          label: string | null
          method: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          counterparty?: string | null
          created_at?: string
          fee?: number
          id?: string
          label?: string | null
          method?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          counterparty?: string | null
          created_at?: string
          fee?: number
          id?: string
          label?: string | null
          method?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          pin_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          pin_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_outflow: {
        Args: {
          _account: string
          _amount: number
          _destination?: string
          _global_pin?: string
          _operation: string
          _pin?: string
          _related?: string
        }
        Returns: Json
      }
      admin_client_detail: { Args: { _user: string }; Returns: Json }
      admin_create_group: {
        Args: {
          _category: string
          _currency: string
          _deadline: string
          _name: string
          _owner: string
          _target: number
        }
        Returns: string
      }
      admin_decide_kyc: {
        Args: { _approved: boolean; _user: string }
        Returns: undefined
      }
      admin_decide_withdrawal: {
        Args: { _approved: boolean; _id: string }
        Returns: undefined
      }
      admin_delete_group: { Args: { _id: string }; Returns: undefined }
      admin_delete_notification: { Args: { _id: string }; Returns: undefined }
      admin_list_accounts: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          currency: string
          filax_id: string
          id: string
          kind: string
          name: string
          owner: string
          status: string
          user_id: string
        }[]
      }
      admin_list_clients: {
        Args: never
        Returns: {
          accounts: Json
          created_at: string
          email: string
          filax_id: string
          first_name: string
          groups_count: number
          kyc_status: string
          last_name: string
          last_tx_at: string
          phone: string
          tx_count: number
          user_id: string
        }[]
      }
      admin_list_groups: {
        Args: never
        Returns: {
          category: string
          collected: number
          contributions_count: number
          created_at: string
          currency: string
          deadline: string
          id: string
          members_count: number
          name: string
          owner_filax_id: string
          owner_id: string
          owner_name: string
          target: number
          withdrawals_count: number
        }[]
      }
      admin_list_kyc: {
        Args: never
        Returns: {
          email: string
          filax_id: string
          first_name: string
          id_document_path: string
          id_document_type: string
          kyc_status: string
          last_name: string
          selfie_path: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_list_notifications: {
        Args: never
        Returns: {
          body: string
          created_at: string
          id: string
          read: boolean
          recipient: string
          title: string
        }[]
      }
      admin_list_withdrawals: {
        Args: never
        Returns: {
          amount: number
          collected: number
          created_at: string
          currency: string
          group_name: string
          id: string
          reason: string
          requester: string
          status: string
        }[]
      }
      admin_send_notification: {
        Args: { _body: string; _title: string; _user: string }
        Returns: number
      }
      admin_set_account_status: {
        Args: { _account: string; _status: string }
        Returns: undefined
      }
      admin_update_group: {
        Args: {
          _category: string
          _deadline: string
          _id: string
          _name: string
          _target: number
        }
        Returns: undefined
      }
      check_pin: { Args: { _pin: string }; Returns: boolean }
      contribute: {
        Args: { _amount: number; _from: string; _group: string }
        Returns: undefined
      }
      create_subaccount: {
        Args: {
          _locked_until?: string
          _name: string
          _parent: string
          _pin: string
          _target: number
          _visual: string
        }
        Returns: string
      }
      deposit: {
        Args: { _account: string; _amount: number; _method: string }
        Returns: string
      }
      filax_fee: { Args: { _amount: number }; Returns: number }
      fund_goal: {
        Args: { _amount: number; _from: string; _goal: string }
        Returns: undefined
      }
      group_member_list: {
        Args: { _group: string }
        Returns: {
          contributed: number
          filax_id: string
          is_owner: boolean
          joined_at: string
          name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_to_group: {
        Args: { _group: string; _identifier: string }
        Returns: string
      }
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      leave_group: { Args: { _group: string }; Returns: undefined }
      owner_update_group: {
        Args: { _deadline: string; _id: string; _name: string; _target: number }
        Returns: undefined
      }
      public_profile: {
        Args: { _username: string }
        Returns: {
          filax_id: string
          first_name: string
          last_name: string
        }[]
      }
      request_group_withdrawal: {
        Args: {
          _account: string
          _amount: number
          _group: string
          _reason: string
        }
        Returns: string
      }
      set_account_visual: {
        Args: { _account: string; _visual: string }
        Returns: undefined
      }
      set_pin: { Args: { _pin: string }; Returns: undefined }
      submit_kyc: {
        Args: { _doc_path: string; _doc_type: string; _selfie_path: string }
        Returns: undefined
      }
      transfer: {
        Args: {
          _amount: number
          _from: string
          _pin: string
          _to_filax_id: string
        }
        Returns: string
      }
      transfer_external: {
        Args: { _amount: number; _from: string; _label: string; _pin: string }
        Returns: string
      }
      valid_account_visual: { Args: { _key: string }; Returns: boolean }
      validate_kyc: {
        Args: { _approved: boolean; _user: string }
        Returns: undefined
      }
      withdraw: {
        Args: { _account: string; _amount: number; _method: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
