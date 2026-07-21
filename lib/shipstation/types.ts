type DeliveryConfirmation =
  | "none"
  | "delivery"
  | "signature"
  | "adult_signature"
  | "direct_signature";

export type ShipStationRatesRequest = {
  carrierCode: string;
  serviceCode?: string;
  packageCode?: string;
  fromPostalCode: string;
  fromCity?: string;
  fromState?: string;
  fromWarehouseId?: string;
  toState?: string; //required from UPS carrier
  toCountry: string;
  toPostalCode: string;
  toCity?: string;
  toName?: string;
  toCompany?: string;
  toStreet1?: string;
  toStreet2?: string;
  toPhone?: string;
  weight: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  confirmation?: DeliveryConfirmation;
  residential?: boolean;
};

export type ShipStationAddress = {
  name: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  street3?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  residential?: boolean;
  addressVerified?: boolean;
};

export type ShipStationWeight = {
  value: number;
  units: "ounces" | "pounds" | "grams";
  WeightUnits?: number;
};

export type ShipStationDimensions = {
  length: number;
  width: number;
  height: number;
  units: "inches" | "centimeters";
};

/**
 * Insurance related types
 * Per BF: Only 'none' and 'carrier'
 */
type InsuranceProvider = "none" | "carrier";
// | "shipsurance"
// | "provider"
// | "xcover"
// | "parcelguard";

export type InsuranceOption = {
  provider: InsuranceProvider;
  insureShipment: boolean;
  insuredValue: number;
};

export type ShipStationCarrier = {
  code: string;
  name: string;
  accountName?: string;
  accountNumber?: string;
  requiresFundedAccount?: boolean;
};

export type ShipStationService = {
  carrierCode: string;
  code: string;
  name: string;
  domestic: boolean;
  international: boolean;
};

export type ShipStationPackage = {
  carrierCode: string;
  packageCode: string;
  name: string;
  dimensionsRequired: boolean;
  domestic: boolean;
  international: boolean;
  code?: string;
};

export type ShipstationVoidLabelResponse = {
  approved: boolean;
  message?: string;
};

export type ShipStationDeleteOrderResponse = {
  success: boolean;
  message: string;
};

export type ShipStationRate = {
  carrierCode: string;
  serviceCode: string;
  serviceName: string;
  shipmentCost: number;
  otherCost?: number;
  deliveryDays?: number | null;
  guaranteedService?: boolean;
  packageType?: string | null;
  confirmation?: string | null;
  residential?: boolean;
  errorMessages?: string[];
};

export type AdvancedOptions = {
  warehouseId?: number | null;
  nonMachinable?: boolean | null;
  saturdayDelivery?: boolean | null;
  containsAlcohol?: boolean | null;
  mergedOrSplit?: boolean | null;
  mergedIds?: string[] | null;
  parentId?: null;
  storeId?: number | null;
  customField1?: string | null;
  customField2?: string | null;
  customField3?: string | null;
  source?: string | null;
  billToParty?: null;
  billToAccount?: null;
  billToPostalCode?: null;
  billToCountryCode?: null;
};

export interface Warehouse {
  warehouseId: number;
  warehouseName: string;
  originAddress: WarehouseOriginAddress;
  returnAddress: WarehouseReturnAddress;
  createDate: string;
  isDefault: boolean;
  sellerIntegrationId: null;
  extInventoryIdentity: null;
  registerFedexMeter: null;
}

interface WarehouseReturnAddress {
  name: string;
  company: string;
  street1: string;
  street2: string;
  street3: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  residential: boolean | null;
  addressVerified: null;
}

interface WarehouseOriginAddress {
  name: string;
  company: string;
  street1: string;
  street2: string;
  street3: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  residential: boolean;
  addressVerified: null;
}
