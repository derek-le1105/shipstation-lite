export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          address_kind?: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          company: string | null;
          contact_name: string | null;
          country: string;
          created_at: string;
          email: string | null;
          id: string;
          is_residential: boolean;
          is_validated: boolean;
          label: string | null;
          phone: string | null;
          postal_code: string;
          state: string;
          user_id: string;
        };
        Insert: {
          address_kind?: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          company?: string | null;
          contact_name?: string | null;
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_residential?: boolean;
          is_validated?: boolean;
          label?: string | null;
          phone?: string | null;
          postal_code: string;
          state: string;
          user_id: string;
        };
        Update: {
          address_kind?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          company?: string | null;
          contact_name?: string | null;
          country?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          is_residential?: boolean;
          is_validated?: boolean;
          label?: string | null;
          phone?: string | null;
          postal_code?: string;
          state?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      app_feedback: {
        Row: {
          created_at: string;
          details: string;
          id: string;
          issue_section: string;
          issue_type: string;
          resolved_at: string | null;
          status: string;
          subject: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          details: string;
          id?: string;
          issue_section: string;
          issue_type: string;
          resolved_at?: string | null;
          status?: string;
          subject: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: string;
          id?: string;
          issue_section?: string;
          issue_type?: string;
          resolved_at?: string | null;
          status?: string;
          subject?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          created_at: string;
          dimension_unit: Database["public"]["Enums"]["package_dimension_units"];
          height: number;
          id: string;
          length: number;
          nickname: string | null;
          updated_at: string | null;
          user_id: string;
          weight: number;
          weight_unit: Database["public"]["Enums"]["package_weight_units"];
          width: number;
        };
        Insert: {
          created_at?: string;
          dimension_unit: Database["public"]["Enums"]["package_dimension_units"];
          height: number;
          id?: string;
          length: number;
          nickname?: string | null;
          updated_at?: string | null;
          user_id: string;
          weight: number;
          weight_unit: Database["public"]["Enums"]["package_weight_units"];
          width: number;
        };
        Update: {
          created_at?: string;
          dimension_unit?: Database["public"]["Enums"]["package_dimension_units"];
          height?: number;
          id?: string;
          length?: number;
          nickname?: string | null;
          updated_at?: string | null;
          user_id?: string;
          weight?: number;
          weight_unit?: Database["public"]["Enums"]["package_weight_units"];
          width?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["user_roles"];
          updated_at: string;
          warehouse_id: number | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["user_roles"];
          updated_at?: string;
          warehouse_id?: number | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["user_roles"];
          updated_at?: string;
          warehouse_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["warehouseId"];
          }
        ];
      };
      shipping_labels: {
        Row: {
          advanced_options: Json | null;
          carrier_code: string;
          confirmation: string | null;
          created_at: string;
          deleted_at: string | null;
          from_address_id: string | null;
          height: number;
          id: string;
          insurance_cost: number | null;
          insurance_options: Json | null;
          is_address_validated: boolean;
          label_data_base64: string | null;
          length: number;
          order_id: number | null;
          order_number: string | null;
          package_code: string | null;
          paid_at: string | null;
          service_code: string;
          ship_from_id: number | null;
          ship_from_snapshot?: Json | null;
          ship_to_snapshot: Json;
          shipment_cost: number | null;
          shipment_id: number;
          to_address_id: string | null;
          total_insurance_cost: number;
          total_shipment_cost: number;
          tracking_number: string | null;
          units: Database["public"]["Enums"]["package_dimension_units"];
          user_id: string;
          voided_at: string | null;
          weight_unit: string;
          weight_value: number;
          width: number;
        };
        Insert: {
          advanced_options?: Json | null;
          carrier_code: string;
          confirmation?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          from_address_id?: string | null;
          height?: number;
          id?: string;
          insurance_cost?: number | null;
          insurance_options?: Json | null;
          is_address_validated?: boolean;
          label_data_base64?: string | null;
          length?: number;
          order_id?: number | null;
          order_number?: string | null;
          package_code?: string | null;
          paid_at?: string | null;
          service_code: string;
          ship_from_id?: number | null;
          ship_from_snapshot?: Json | null;
          ship_to_snapshot: Json;
          shipment_cost?: number | null;
          shipment_id: number;
          to_address_id?: string | null;
          total_insurance_cost?: number;
          total_shipment_cost?: number;
          tracking_number?: string | null;
          units?: Database["public"]["Enums"]["package_dimension_units"];
          user_id: string;
          voided_at?: string | null;
          weight_unit: string;
          weight_value: number;
          width?: number;
        };
        Update: {
          advanced_options?: Json | null;
          carrier_code?: string;
          confirmation?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          from_address_id?: string | null;
          height?: number;
          id?: string;
          insurance_cost?: number | null;
          insurance_options?: Json | null;
          is_address_validated?: boolean;
          label_data_base64?: string | null;
          length?: number;
          order_id?: number | null;
          order_number?: string | null;
          package_code?: string | null;
          paid_at?: string | null;
          service_code?: string;
          ship_from_id?: number | null;
          ship_from_snapshot?: Json | null;
          ship_to_snapshot?: Json;
          shipment_cost?: number | null;
          shipment_id?: number;
          to_address_id?: string | null;
          total_insurance_cost?: number;
          total_shipment_cost?: number;
          tracking_number?: string | null;
          units?: Database["public"]["Enums"]["package_dimension_units"];
          user_id?: string;
          voided_at?: string | null;
          weight_unit?: string;
          weight_value?: number;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shipping_labels_from_address_id_fkey";
            columns: ["from_address_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipping_labels_ship_from_id_fkey";
            columns: ["ship_from_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["warehouseId"];
          },
          {
            foreignKeyName: "shipping_labels_to_address_id_fkey";
            columns: ["to_address_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipping_labels_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      warehouses: {
        Row: {
          createDate: string | null;
          extInventoryIdentity: number | null;
          isDefault: boolean | null;
          originAddress_addressVerified: boolean | null;
          originAddress_city: string | null;
          originAddress_company: string | null;
          originAddress_country: string | null;
          originAddress_name: string | null;
          originAddress_phone: string | null;
          originAddress_postalCode: string | null;
          originAddress_residential: boolean | null;
          originAddress_state: string | null;
          originAddress_street1: string | null;
          originAddress_street2: string | null;
          originAddress_street3: string | null;
          registerFedexMeter: boolean | null;
          returnAddress_addressVerified: boolean | null;
          returnAddress_city: string | null;
          returnAddress_company: string | null;
          returnAddress_country: string | null;
          returnAddress_name: string | null;
          returnAddress_phone: string | null;
          returnAddress_postalCode: string | null;
          returnAddress_residential: boolean | null;
          returnAddress_state: string | null;
          returnAddress_street1: string | null;
          returnAddress_street2: string | null;
          returnAddress_street3: string | null;
          sellerIntegrationId: number | null;
          warehouseId: number;
          warehouseName: string | null;
        };
        Insert: {
          createDate?: string | null;
          extInventoryIdentity?: number | null;
          isDefault?: boolean | null;
          originAddress_addressVerified?: boolean | null;
          originAddress_city?: string | null;
          originAddress_company?: string | null;
          originAddress_country?: string | null;
          originAddress_name?: string | null;
          originAddress_phone?: string | null;
          originAddress_postalCode?: string | null;
          originAddress_residential?: boolean | null;
          originAddress_state?: string | null;
          originAddress_street1?: string | null;
          originAddress_street2?: string | null;
          originAddress_street3?: string | null;
          registerFedexMeter?: boolean | null;
          returnAddress_addressVerified?: boolean | null;
          returnAddress_city?: string | null;
          returnAddress_company?: string | null;
          returnAddress_country?: string | null;
          returnAddress_name?: string | null;
          returnAddress_phone?: string | null;
          returnAddress_postalCode?: string | null;
          returnAddress_residential?: boolean | null;
          returnAddress_state?: string | null;
          returnAddress_street1?: string | null;
          returnAddress_street2?: string | null;
          returnAddress_street3?: string | null;
          sellerIntegrationId?: number | null;
          warehouseId?: number;
          warehouseName?: string | null;
        };
        Update: {
          createDate?: string | null;
          extInventoryIdentity?: number | null;
          isDefault?: boolean | null;
          originAddress_addressVerified?: boolean | null;
          originAddress_city?: string | null;
          originAddress_company?: string | null;
          originAddress_country?: string | null;
          originAddress_name?: string | null;
          originAddress_phone?: string | null;
          originAddress_postalCode?: string | null;
          originAddress_residential?: boolean | null;
          originAddress_state?: string | null;
          originAddress_street1?: string | null;
          originAddress_street2?: string | null;
          originAddress_street3?: string | null;
          registerFedexMeter?: boolean | null;
          returnAddress_addressVerified?: boolean | null;
          returnAddress_city?: string | null;
          returnAddress_company?: string | null;
          returnAddress_country?: string | null;
          returnAddress_name?: string | null;
          returnAddress_phone?: string | null;
          returnAddress_postalCode?: string | null;
          returnAddress_residential?: boolean | null;
          returnAddress_state?: string | null;
          returnAddress_street1?: string | null;
          returnAddress_street2?: string | null;
          returnAddress_street3?: string | null;
          sellerIntegrationId?: number | null;
          warehouseId?: number;
          warehouseName?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      dreamlit_auth_admin_executor: {
        Args: { command: string };
        Returns: undefined;
      };
      get_shipping_label_order_string: { Args: never; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      next_shipping_label_order_number: { Args: never; Returns: string };
    };
    Enums: {
      feedback_source: "web" | "ios" | "android" | "other";
      package_dimension_units: "inches" | "centimeters";
      package_weight_units: "pounds" | "ounces" | "grams";
      upcharging_unit: "dollars" | "percent";
      user_roles: "user" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
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
      feedback_source: ["web", "ios", "android", "other"],
      package_dimension_units: ["inches", "centimeters"],
      package_weight_units: ["pounds", "ounces", "grams"],
      upcharging_unit: ["dollars", "percent"],
      user_roles: ["user", "admin"],
    },
  },
} as const;
