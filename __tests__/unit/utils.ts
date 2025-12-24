import type { AddressRecord } from "@/lib/supabase/addresses";
import { WarehouseRecord } from "@/lib/supabase/warehouses";

export function buildAddressRecord(
  overrides?: Partial<AddressRecord>
): AddressRecord {
  return {
    id: "addr-1",
    user_id: "user-1",
    label: "Warehouse",
    contact_name: "Jane Doe",
    company: null,
    phone: null,
    email: null,
    address_line1: "123 Main St",
    address_line2: null,
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    country: "US",
    is_residential: false,
    is_validated: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function buildWarehouseRecord(): WarehouseRecord {
  return {
    warehouseId: 123456,
    warehouseName: "TEST WAREHOUSE",
    createDate: "2025-12-12",
    isDefault: false,
    sellerIntegrationId: null,
    extInventoryIdentity: null,
    registerFedexMeter: null,
    originAddress_name: "TEST USER",
    originAddress_company: "TEST COMPANY",
    originAddress_street1: "123 BEST ST",
    originAddress_street2: "",
    originAddress_street3: "",
    originAddress_city: "TEST CITY",
    originAddress_postalCode: "12345",
    originAddress_country: "USA",
    originAddress_state: "CA",
    originAddress_phone: "123-456-7890",
    originAddress_addressVerified: null,
    originAddress_residential: true,
    returnAddress_name: "TEST USER",
    returnAddress_company: "TEST COMPANY",
    returnAddress_street1: "123 BEST ST",
    returnAddress_street2: "",
    returnAddress_street3: "",
    returnAddress_city: "TEST CITY",
    returnAddress_postalCode: "12345",
    returnAddress_country: "USA",
    returnAddress_state: "CA",
    returnAddress_phone: "123-456-7890",
    returnAddress_addressVerified: null,
    returnAddress_residential: true,
  };
}
