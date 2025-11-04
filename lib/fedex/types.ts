export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/**
 * Response from FedEx Address Validation API
 */
export interface AddressValidationResponse {
  /**
   * Unique identifier returned in the reply and helps you match the request to the reply.
   */
  transactionId: string;

  /**
   * This element allows you to assign a unique identifier to your transaction. This element is also returned in the reply and helps you match the request to the reply.
   */
  customerTransactionId: string;

  /**
   * Indicates the resolved address parameters.
   */
  output: ResolvedAddressParameters;
}

interface ResolvedAddressParameters {
  /**
   * The detailed resolved address includes city, state, postal information, and resolution method.
   */
  resolvedAddresses: ResolvedAddress[];
  alerts: ResolvedAddressAlert[];
}

/**
 * Indicates API Alerts includes alert type, alert code, and alert message that is received when the address is resolved.
 */
interface ResolvedAddressAlert {
  code: string;
  message: string;
  alertType: string;
}

/**
 * Indicates the list of resolved addresses. The detailed resolved address includes city, state, postal information, and resolution method.
 */
interface ResolvedAddress {
  streetLinesToken: string[];
  city: string;
  stateOrProvinceCode: string;
  countryCode: string;
  customerMessages: (CustomerMessage | null)[];
  cityToken: string[];
  postalCodeToken: PostalCodeToken;
  parsedPostalCode: ParsedPostalCode;
  classification: string;
  postOfficeBox: boolean;
  normalizedStatusNameDPV: boolean;
  standardizedStatusNameMatchSource: string;
  resolutionMethodName: string;
  ruralRouteHighwayContract: boolean;
  generalDelivery: boolean;
  attributes: Attributes;
}

interface CustomerMessage {
  code: string;
  message: string;
}

interface Attributes {
  POBox: boolean;
  POBoxOnlyZIP: boolean;
  SplitZip: boolean;
  SuiteRequiredButMissing: boolean;
  InvalidSuiteNumber: boolean;
  ResolutionInput: string;
  DPV: boolean;
  ResolutionMethod: string;
  DataVintage: string;
  MatchSource: string;
  CountrySupported: boolean;
  ValidlyFormed: boolean;
  Matched: boolean;
  Resolved: boolean;
  Inserted: boolean;
  MultiUnitBase: boolean;
  ZIP11Match: boolean;
  ZIP4Match: boolean;
  UniqueZIP: boolean;
  StreetAddress: boolean;
  RRConversion: boolean;
  ValidMultiUnit: boolean;
  AddressType: string;
  AddressPrecision: string;
  MultipleMatches: boolean;
}

interface ParsedPostalCode {
  base: string;
  addOn: string;
  deliveryPoint: string;
}

interface PostalCodeToken {
  changed: boolean;
  value: string;
}
