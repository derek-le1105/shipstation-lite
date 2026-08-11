// ShipStation API V2 (api.shipstation.com) payload/response shapes.
// Only the fields this app actually reads/writes are modeled.

export type V2Address = {
  name: string;
  phone?: string | null;
  company_name?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city_locality: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  address_residential_indicator?: "yes" | "no" | "unknown";
};

export type V2Weight = {
  value: number;
  unit: "pound" | "ounce" | "gram" | "kilogram";
};

export type V2Dimensions = {
  unit: "inch" | "centimeter";
  length: number;
  width: number;
  height: number;
};

export type V2InsuredValue = {
  currency: string;
  amount: number;
};

export type V2Package = {
  weight: V2Weight;
  dimensions?: V2Dimensions;
  insured_value?: V2InsuredValue;
  external_package_id?: string;
};

export type V2AdvancedOptions = {
  saturday_delivery?: boolean;
};

export type V2CreateShipmentPayload = {
  shipment: {
    carrier_id: string;
    service_code: string;
    ship_to: V2Address;
    ship_from: V2Address;
    confirmation?:
      | "none"
      | "delivery"
      | "signature"
      | "adult_signature"
      | "direct_signature";
    warehouse_id?: number;
    external_order_id: string | null;
    external_shipment_id: string | null;
    tags?: { name: string }[];
    insurance_provider?: "none" | "shipsurance" | "carrier" | "third_party";
    advanced_options?: V2AdvancedOptions;
    packages: V2Package[];
    create_sales_order?: boolean;
  };
  test_label?: boolean;
};

export type V2PackageResult = {
  package_id: number;
  tracking_number: string;
  weight: V2Weight;
  dimensions?: V2Dimensions;
  label_download?: { href: string; pdf: string; png: string; zpl: string };
  sequence: number;
};

export type V2LabelResponse = {
  label_id: string;
  shipment_id: string;
  status: string;
  shipment_cost: { currency: string; amount: number };
  insurance_cost: { currency: string; amount: number };
  tracking_number: string; // parent/shipment-level tracking number for multi-package shipments
  carrier_code: string;
  service_code: string;
  voided: boolean;
  label_download?: { href: string; pdf: string; png: string; zpl: string };
  packages: V2PackageResult[];
};

export type V2VoidResponse = {
  approved: boolean;
  message?: string;
};

export type V2Carrier = {
  carrier_id: string;
  carrier_code: string;
  friendly_name: string;
  services: V2Service[];
  packages: V2PackageType[];
};

export type V2Service = {
  carrier_id: string;
  carrier_code: string;
  service_code: string;
  name: string;
  domestic: boolean;
  international: boolean;
};

export type V2PackageType = {
  package_id: string;
  carrier_id: string;
  package_code: string;
  name: string;
  dimensions_required: boolean;
  domestic: boolean;
  international: boolean;
};

export type V2RateRequest = {
  rate_options: {
    rate_type: string;
    carrier_ids: string[];
    service_codes?: string[];
  };
  shipment: {
    ship_to: V2Address;
    ship_from: V2Address;
    packages: V2Package[];
    confirmation?: string;
  };
};

export type V2Rate = {
  rate_id: string;
  carrier_id: string;
  service_code: string;
  service_type: string;
  shipping_amount: { currency: string; amount: number };
  confirmation_amount?: { currency: string; amount: number };
  delivery_days?: number | null;
};

export type V2RateResponse = {
  rate_response: {
    rates: V2Rate[];
  };
};

export type V2Warehouse = {
  warehouse_id: number;
  name: string;
  origin_address: V2Address;
  return_address: V2Address;
  is_default: boolean;
};

export type V2Shipment = {
  shipment_id: string;
  external_shipment_id?: string;
  shipment_status: string;
};
