import type { ShipstationRatesRequest } from "@/lib/shipstation/client";
import type { AddressRecord } from "@/lib/supabase/addresses";
import { AddressMode } from "@/components/shipping/types";

type RateDimensions = ShipstationRatesRequest["dimensions"];

type RateAddress = {
  city: string;
  state: string;
  postalCode: string;
  country: string;
  residential?: boolean;
};

const VALID_WEIGHT_UNITS = new Set(["ounces", "pounds", "grams"]);
const VALID_DIMENSION_UNITS = new Set(["inches", "centimeters"]);

export function parseCheckboxValue(value: FormDataEntryValue | null) {
  if (!value) return false;
  return value === "true" || value === "on" || value === "1";
}

export function resolveAddressFromForm(
  formData: FormData,
  prefix: "from" | "to",
  savedAddresses: AddressRecord[],
  fallbackMode: AddressMode
): RateAddress | null {
  const modeValue =
    (formData.get(`${prefix}.mode`) as AddressMode | null) ?? fallbackMode;

  if (modeValue === "saved") {
    const addressId = formData.get(`${prefix}.addressId`);
    if (!addressId) return null;

    const address = savedAddresses.find((item) => item.id === addressId);
    if (!address) return null;

    const { city, state, postal_code, country, is_residential } = address;

    if (!city || !state || !postal_code || !country) {
      return null;
    }

    return {
      city: city.trim(),
      state: state.trim(),
      postalCode: postal_code.trim(),
      country: country.trim(),
      residential: is_residential,
    };
  }

  const city = (formData.get(`${prefix}.city`) as string | null)?.trim() ?? "";
  const state =
    (formData.get(`${prefix}.state`) as string | null)?.trim() ?? "";
  const postalCode =
    (formData.get(`${prefix}.postal_code`) as string | null)?.trim() ?? "";
  const country =
    (formData.get(`${prefix}.country`) as string | null)?.trim() ?? "";

  if (!city || !state || !postalCode || !country) {
    return null;
  }

  return {
    city,
    state,
    postalCode,
    country,
    residential: parseCheckboxValue(formData.get(`${prefix}.is_residential`)),
  };
}

export function buildRatesRequest(
  formData: FormData,
  params: {
    fromAddresses: AddressRecord[];
    toAddresses: AddressRecord[];
    fromMode: AddressMode;
    toMode: AddressMode;
  }
): ShipstationRatesRequest | null {
  const carrierCode =
    (formData.get("carrierCode") as string | null)?.trim() ?? "";
  if (!carrierCode) return null;

  const serviceCode =
    (formData.get("serviceCode") as string | null)?.trim() ?? "";
  if (!serviceCode) return null;

  const fromAddress = resolveAddressFromForm(
    formData,
    "from",
    params.fromAddresses,
    params.fromMode
  );
  const toAddress = resolveAddressFromForm(
    formData,
    "to",
    params.toAddresses,
    params.toMode
  );

  if (!fromAddress || !toAddress) return null;

  const weightValueRaw =
    (formData.get("weight.value") as string | null)?.trim() ?? "";
  const weightValue = Number.parseFloat(weightValueRaw);
  const weightUnit =
    (formData.get("weight.unit") as string | null)?.trim() ?? "";

  if (!Number.isFinite(weightValue) || weightValue <= 0) return null;
  if (!VALID_WEIGHT_UNITS.has(weightUnit)) return null;

  const lengthValue = Number.parseFloat(
    ((formData.get("dimensions.length") as string | null) ?? "").trim()
  );
  const widthValue = Number.parseFloat(
    ((formData.get("dimensions.width") as string | null) ?? "").trim()
  );
  const heightValue = Number.parseFloat(
    ((formData.get("dimensions.height") as string | null) ?? "").trim()
  );
  const dimensionUnit =
    (formData.get("dimensions.unit") as string | null)?.trim() ?? "";

  const hasDimensions =
    Number.isFinite(lengthValue) &&
    Number.isFinite(widthValue) &&
    Number.isFinite(heightValue) &&
    lengthValue > 0 &&
    widthValue > 0 &&
    heightValue > 0 &&
    VALID_DIMENSION_UNITS.has(dimensionUnit);

  const dimensions: RateDimensions = hasDimensions
    ? {
        length: lengthValue,
        width: widthValue,
        height: heightValue,
        units: dimensionUnit as NonNullable<RateDimensions>["units"],
      }
    : undefined;

  return {
    carrierCode,
    serviceCode,
    packageCode: "package",
    fromPostalCode: fromAddress.postalCode,
    fromCity: fromAddress.city,
    fromState: fromAddress.state,
    toPostalCode: toAddress.postalCode,
    toCountry: toAddress.country.toUpperCase(),
    toCity: toAddress.city,
    toState: toAddress.state,
    weight: {
      value: weightValue,
      units: weightUnit as ShipstationRatesRequest["weight"]["units"],
    },
    dimensions,
    residential: toAddress.residential ?? undefined,
  };
}

export function compareDimensions(
  a: RateDimensions,
  b: RateDimensions
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.length === b.length &&
    a.width === b.width &&
    a.height === b.height &&
    a.units === b.units
  );
}

export function areRateRequestsEqual(
  previous: ShipstationRatesRequest | null,
  next: ShipstationRatesRequest | null
): boolean {
  if (previous === next) return true;
  if (!previous || !next) return false;

  return (
    previous.carrierCode === next.carrierCode &&
    (previous.serviceCode ?? "") === (next.serviceCode ?? "") &&
    (previous.packageCode ?? "") === (next.packageCode ?? "") &&
    previous.fromPostalCode === next.fromPostalCode &&
    (previous.fromCity ?? "") === (next.fromCity ?? "") &&
    (previous.fromState ?? "") === (next.fromState ?? "") &&
    (previous.fromWarehouseId ?? "") === (next.fromWarehouseId ?? "") &&
    (previous.toState ?? "") === (next.toState ?? "") &&
    previous.toCountry === next.toCountry &&
    previous.toPostalCode === next.toPostalCode &&
    (previous.toCity ?? "") === (next.toCity ?? "") &&
    previous.weight.value === next.weight.value &&
    previous.weight.units === next.weight.units &&
    compareDimensions(previous.dimensions, next.dimensions) &&
    previous.residential === next.residential &&
    (previous.confirmation ?? "") === (next.confirmation ?? "")
  );
}
