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

export type CreateLabelPayload = {
  carrierCode: string;
  serviceCode: string;
  packageCode?: string;
  confirmation?: string;
  shipFrom: ShipStationAddress;
  shipTo: ShipStationAddress;
  weight: ShipStationWeight;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    units: "inches" | "centimeters";
  };
  //testLabel?: boolean;
  externalOrderId?: string;
  insuranceOptions?: {
    insureShipment: boolean;
    insuredValue: number;
  };
};

export type ShipStationLabel = {
  shipmentId: number;
  orderId?: number;
  orderKey?: string;
  userId?: number;
  customerEmail?: string;
  orderNumber?: string;
  createDate?: string;
  shipDate?: string;
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber?: string;
  isReturnLabel: boolean;
  batchNumber?: number;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation: string;
  warehouseId?: number;
  voided?: boolean;
  voidDate?: string;
  marketplaceNotified?: boolean;
  notifyErrorMessage?: string;
  shipTo: ShipStationAddress;
  weight: ShipStationWeight;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    units: "inches" | "centimeters";
  };
  insuranceOptions?: unknown;
  advancedOptions?: unknown;
  shipmentItems?: unknown[];
  labelData?: string;
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

type OrderStatus =
  | "awaiting_shipment"
  | "shipping"
  | "on_hold"
  | "cancelled"
  | "pending_fulfillment";

type InsuranceOptions = {
  provider: string;
  insureShipment: boolean;
  insuredValue: number;
};

type InternationalOptions = {
  contents: "merchandise" | "documents" | "gift" | "returned_goods" | "other";
  customsItems: unknown;
  nonDelivery: string;
};

export type CreateOrderPayload = {
  orderId?: number;
  orderNumber: string;
  orderKey?: string;
  orderDate: string;
  paymentDate?: string;
  shipByDate?: string;
  orderStatus: OrderStatus;
  customerUsername?: string;
  customerEmail?: string;
  billTo: ShipStationAddress;
  shipTo: ShipStationAddress;
  items?: ShipStationOrderItem[];
  amountPaid?: number;
  taxAmount?: number;
  shippingAmount?: number;
  customerNotes?: string;
  internalNotes?: string;
  gift?: boolean;
  giftMessage?: string;
  paymentMethod?: string;
  requestedShippingService?: string;
  carrierCode?: string;
  serviceCode?: string;
  packageCode?: string;
  confirmation?: DeliveryConfirmation;
  shipDate?: string;
  weight?: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  insuranceOptions?: InsuranceOptions;
  internationalOptions?: InternationalOptions;
  customsCountryCode?: string;
  advancedOptions?: unknown;
  tagIds?: number[];
};

export type ShipStationOrderItem = {
  orderItemId: number;
  lineItemKey: string;
  sku: string;
  name: string;
  imageUrl: string;
  weight: ShipStationWeight;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  shippingAmount: number;
  warehouseLocation: string;
  options: { name: string; value: string }[];
  productId: number;
  fulfillmentSku: string;
  adjustment: boolean;
  upc: string;
  createDate: string;
  modifyDate: string;
};
