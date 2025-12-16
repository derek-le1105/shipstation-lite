import { describe, expect, it } from "vitest";

import type { ShipStationRatesRequest } from "@/lib/shipstation/types";
import type { AddressRecord } from "@/lib/supabase/addresses";
import type { PackageRecord } from "@/lib/supabase/packages";
import {
  areRateRequestsEqual,
  buildRatesRequest,
  compareDimensions,
  parseCheckboxValue,
  resolveAddressFromForm,
  savePackageToFormData,
} from "@/lib/shipping-label/utils";

function setField(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildAddressRecord(overrides?: Partial<AddressRecord>): AddressRecord {
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
    address_kind: "ship_from",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("parseCheckboxValue", () => {
  it("treats common truthy values as true", () => {
    expect(parseCheckboxValue("true")).toBe(true);
    expect(parseCheckboxValue("on")).toBe(true);
    expect(parseCheckboxValue("1")).toBe(true);
  });

  it("treats other values and null as false", () => {
    expect(parseCheckboxValue(null)).toBe(false);
    expect(parseCheckboxValue("")).toBe(false);
    expect(parseCheckboxValue("false")).toBe(false);
    expect(parseCheckboxValue("0")).toBe(false);
    expect(parseCheckboxValue("yes")).toBe(false);
  });
});

describe("resolveAddressFromForm", () => {
  it("returns a saved address when mode is saved", () => {
    const formData = new FormData();
    setField(formData, "from.mode", "saved");
    setField(formData, "from.addressId", "addr-1");

    const savedAddresses = [
      buildAddressRecord({
        id: "addr-1",
        city: "  Austin ",
        state: " TX ",
        postal_code: " 78701 ",
        country: " us ",
        is_residential: true,
      }),
    ];

    expect(
      resolveAddressFromForm(formData, "from", savedAddresses, "new")
    ).toEqual({
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "us",
      residential: true,
    });
  });

  it("returns null when mode is saved but the address is missing or incomplete", () => {
    const formData = new FormData();
    setField(formData, "to.mode", "saved");
    setField(formData, "to.addressId", "addr-missing");

    expect(resolveAddressFromForm(formData, "to", [], "new")).toBeNull();

    const savedAddresses = [
      buildAddressRecord({
        id: "addr-2",
        // city missing triggers null
        city: "" as any,
      }),
    ];
    setField(formData, "to.addressId", "addr-2");
    expect(resolveAddressFromForm(formData, "to", savedAddresses, "new")).toBeNull();
  });

  it("returns a new address from form fields and defaults country to US", () => {
    const formData = new FormData();
    setField(formData, "to.mode", "new");
    setField(formData, "to.city", "  Austin ");
    setField(formData, "to.state", " TX ");
    setField(formData, "to.postal_code", " 78701 ");
    setField(formData, "to.is_residential", "on");
    // to.country omitted -> defaults to US

    expect(resolveAddressFromForm(formData, "to", [], "new")).toEqual({
      city: "Austin",
      state: "TX",
      postalCode: "78701",
      country: "US",
      residential: true,
    });
  });

  it("returns null when required new-address fields are missing", () => {
    const formData = new FormData();
    setField(formData, "from.mode", "new");
    setField(formData, "from.city", "");
    setField(formData, "from.state", "TX");
    setField(formData, "from.postal_code", "78701");

    expect(resolveAddressFromForm(formData, "from", [], "new")).toBeNull();
  });
});

describe("buildRatesRequest", () => {
  function buildBaseFormData(index = 0) {
    const formData = new FormData();
    setField(formData, "carrierCode", "fedex");
    setField(formData, "serviceCode", "fedex_ground");

    setField(formData, "from.mode", "new");
    setField(formData, "from.city", "Austin");
    setField(formData, "from.state", "TX");
    setField(formData, "from.postal_code", "78701");
    setField(formData, "from.country", "US");

    setField(formData, "to.mode", "new");
    setField(formData, "to.city", "Seattle");
    setField(formData, "to.state", "WA");
    setField(formData, "to.postal_code", "98101");
    setField(formData, "to.country", "us");
    setField(formData, "to.is_residential", "1");

    setField(formData, `package-${index}.weight.value`, "2.5");
    setField(formData, `package-${index}.weight.unit`, "pounds");

    return formData;
  }

  it("returns null when required fields are missing/invalid", () => {
    const base = buildBaseFormData();
    base.delete("carrierCode");
    expect(
      buildRatesRequest(0, base, {
        fromAddresses: [],
        toAddresses: [],
        fromMode: "new",
        toMode: "new",
      })
    ).toBeNull();

    const badWeight = buildBaseFormData();
    setField(badWeight, "carrierCode", "fedex");
    setField(badWeight, `package-0.weight.value`, "0");
    expect(
      buildRatesRequest(0, badWeight, {
        fromAddresses: [],
        toAddresses: [],
        fromMode: "new",
        toMode: "new",
      })
    ).toBeNull();

    const badUnit = buildBaseFormData();
    setField(badUnit, `package-0.weight.unit`, "kg");
    expect(
      buildRatesRequest(0, badUnit, {
        fromAddresses: [],
        toAddresses: [],
        fromMode: "new",
        toMode: "new",
      })
    ).toBeNull();
  });

  it("builds a rates request with optional dimensions when complete and valid", () => {
    const formData = buildBaseFormData();
    setField(formData, "to.is_residential", "false");
    setField(formData, "to.country", "ca");

    setField(formData, "package-0.dimensions.length", "10");
    setField(formData, "package-0.dimensions.width", "5");
    setField(formData, "package-0.dimensions.height", "2");
    setField(formData, "package-0.dimensions.unit", "inches");

    const result = buildRatesRequest(0, formData, {
      fromAddresses: [],
      toAddresses: [],
      fromMode: "new",
      toMode: "new",
    });

    expect(result).toEqual({
      carrierCode: "fedex",
      serviceCode: "fedex_ground",
      packageCode: "package",
      fromPostalCode: "78701",
      fromCity: "Austin",
      fromState: "TX",
      toPostalCode: "98101",
      toCountry: "CA",
      toCity: "Seattle",
      toState: "WA",
      weight: { value: 2.5, units: "pounds" },
      dimensions: { length: 10, width: 5, height: 2, units: "inches" },
      residential: false,
    });
  });

  it("omits dimensions when incomplete/invalid", () => {
    const formData = buildBaseFormData();
    setField(formData, "package-0.dimensions.length", "10");
    setField(formData, "package-0.dimensions.width", "5");
    setField(formData, "package-0.dimensions.height", ""); // incomplete
    setField(formData, "package-0.dimensions.unit", "inches");

    const result = buildRatesRequest(0, formData, {
      fromAddresses: [],
      toAddresses: [],
      fromMode: "new",
      toMode: "new",
    });

    expect(result).not.toBeNull();
    expect(result?.dimensions).toBeUndefined();
  });

  it("supports saved address modes via params fallback", () => {
    const formData = buildBaseFormData();
    setField(formData, "from.mode", "saved");
    setField(formData, "from.addressId", "from-1");

    setField(formData, "to.mode", "saved");
    setField(formData, "to.addressId", "to-1");

    const fromAddresses = [
      buildAddressRecord({
        id: "from-1",
        city: "From City",
        state: "FC",
        postal_code: "11111",
        country: "US",
      }),
    ];
    const toAddresses = [
      buildAddressRecord({
        id: "to-1",
        city: "To City",
        state: "TC",
        postal_code: "22222",
        country: "mx",
        is_residential: true,
      }),
    ];

    const result = buildRatesRequest(0, formData, {
      fromAddresses,
      toAddresses,
      fromMode: "saved",
      toMode: "saved",
    });

    expect(result).toEqual(
      expect.objectContaining({
        fromPostalCode: "11111",
        fromCity: "From City",
        fromState: "FC",
        toPostalCode: "22222",
        toCity: "To City",
        toState: "TC",
        toCountry: "MX",
        residential: true,
      })
    );
  });
});

describe("compareDimensions", () => {
  it("handles undefined dimensions", () => {
    expect(compareDimensions(undefined, undefined)).toBe(true);
    expect(compareDimensions(undefined, { length: 1, width: 1, height: 1, units: "inches" })).toBe(
      false
    );
    expect(compareDimensions({ length: 1, width: 1, height: 1, units: "inches" }, undefined)).toBe(
      false
    );
  });

  it("compares dimension equality", () => {
    expect(
      compareDimensions(
        { length: 1, width: 2, height: 3, units: "inches" },
        { length: 1, width: 2, height: 3, units: "inches" }
      )
    ).toBe(true);
    expect(
      compareDimensions(
        { length: 1, width: 2, height: 3, units: "inches" },
        { length: 1, width: 2, height: 3, units: "centimeters" }
      )
    ).toBe(false);
  });
});

describe("areRateRequestsEqual", () => {
  const base: ShipStationRatesRequest = {
    carrierCode: "fedex",
    serviceCode: "svc",
    packageCode: "package",
    fromPostalCode: "78701",
    fromCity: "Austin",
    fromState: "TX",
    toPostalCode: "98101",
    toCountry: "US",
    toCity: "Seattle",
    toState: "WA",
    weight: { value: 2.5, units: "pounds" },
    dimensions: { length: 10, width: 5, height: 2, units: "inches" },
    residential: true,
    confirmation: "delivery",
  };

  it("returns true for reference equality and handles nulls", () => {
    expect(areRateRequestsEqual(base, base)).toBe(true);
    expect(areRateRequestsEqual(null, null)).toBe(true);
    expect(areRateRequestsEqual(base, null)).toBe(false);
    expect(areRateRequestsEqual(null, base)).toBe(false);
  });

  it("treats missing optional strings as empty string", () => {
    const a: ShipStationRatesRequest = { ...base, serviceCode: undefined };
    const b: ShipStationRatesRequest = { ...base, serviceCode: "" };
    expect(areRateRequestsEqual(a, b)).toBe(true);
  });

  it("detects changes including dimensions and confirmation", () => {
    expect(areRateRequestsEqual(base, { ...base, toPostalCode: "99999" })).toBe(
      false
    );
    expect(
      areRateRequestsEqual(base, {
        ...base,
        dimensions: { ...base.dimensions!, height: 3 },
      })
    ).toBe(false);
    expect(
      areRateRequestsEqual(base, { ...base, confirmation: "signature" })
    ).toBe(false);
  });
});

describe("savePackageToFormData", () => {
  it("writes package fields into form data", () => {
    const formData = new FormData();
    const pkg: PackageRecord = {
      id: "pkg-1",
      user_id: "user-1",
      length: 10,
      width: 5,
      height: 2,
      dimension_unit: "inches",
      weight: 2.5,
      weight_unit: "pounds",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      nickname: "Box",
    };

    savePackageToFormData(formData, 0, pkg);

    expect(formData.get("package-0.id")).toBe("pkg-1");
    expect(formData.get("package-0.dimensions.length")).toBe("10");
    expect(formData.get("package-0.dimensions.width")).toBe("5");
    expect(formData.get("package-0.dimensions.height")).toBe("2");
    expect(formData.get("package-0.weight.value")).toBe("2.5");
    expect(formData.get("package-0.dimensions.unit")).toBe("inches");
    expect(formData.get("package-0.weight.unit")).toBe("pounds");
  });
});

