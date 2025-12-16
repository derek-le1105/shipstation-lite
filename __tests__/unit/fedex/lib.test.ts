import { beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.fn();

vi.mock("@/lib/fedex/client", () => {
  class MockFedExClient {
    post = postMock;
  }
  return { default: MockFedExClient };
});

function setFormValue(formData: FormData, key: string, value: string) {
  formData.set(key, value);
}

function buildFormData(overrides?: Partial<Record<string, string>>) {
  const formData = new FormData();
  setFormValue(formData, "address_line1", "123 Main St");
  setFormValue(formData, "address_line2", "Apt 5");
  setFormValue(formData, "city", "Austin");
  setFormValue(formData, "state", "TX");
  setFormValue(formData, "postal_code", "78701");

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      setFormValue(formData, key, value ?? "");
    }
  }

  return formData;
}

function buildAddressValidationResponse(overrides?: any) {
  return {
    transactionId: "t-1",
    customerTransactionId: "c-1",
    output: {
      alerts: [],
      resolvedAddresses: [
        {
          streetLinesToken: ["123 MAIN ST", "APT 5"],
          city: "Austin",
          stateOrProvinceCode: "TX",
          countryCode: "US",
          customerMessages: [],
          postalCodeToken: { changed: false, value: "78701" },
          parsedPostalCode: { base: "78701", addOn: "1234", deliveryPoint: "56" },
          classification: "BUSINESS",
          postOfficeBox: "false",
          attributes: {
            DPV: "true",
            Matched: "true",
            Resolved: "true",
            StreetAddress: "true",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("validateAddress", () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it("posts the expected resolve request body", async () => {
    postMock.mockResolvedValue(buildAddressValidationResponse());
    const { validateAddress } = await import("@/lib/fedex/lib");

    const formData = buildFormData({ address_line2: "" });
    await validateAddress(formData);

    expect(postMock).toHaveBeenCalledWith("/address/v1/addresses/resolve", {
      addressesToValidate: [
        {
          address: {
            streetLines: ["123 Main St"],
            city: "Austin",
            stateOrProvinceCode: "TX",
            postalCode: "78701",
            countryCode: "US",
          },
        },
      ],
    });
  });

  it("returns a minimal success summary when valid with no issues", async () => {
    postMock.mockResolvedValue(buildAddressValidationResponse());
    const { validateAddress } = await import("@/lib/fedex/lib");

    const result = await validateAddress(buildFormData());

    expect(result).toEqual({
      valid: true,
      issues: [],
      normalized: {
        streetLines: ["123 MAIN ST", "APT 5"],
        city: "Austin",
        stateOrProvinceCode: "TX",
        postalCode: "78701-1234",
        countryCode: "US",
        classification: "BUSINESS",
      },
    });
  });

  it("combines alerts, customer messages, and derived issues (alerts first)", async () => {
    postMock.mockResolvedValue(
      buildAddressValidationResponse({
        output: {
          alerts: [{ code: "ALERT", message: "Be careful" }],
          resolvedAddresses: [
            {
              streetLinesToken: ["123 MAIN ST"],
              city: "Austin",
              stateOrProvinceCode: "TX",
              countryCode: "US",
              customerMessages: [
                { code: "CM", message: "Customer note" },
                null,
              ],
              postalCodeToken: { changed: false, value: "78701" },
              parsedPostalCode: { base: "78701", addOn: "", deliveryPoint: "" },
              classification: "BUSINESS",
              postOfficeBox: "false",
              attributes: {
                DPV: "true",
                Matched: "true",
                Resolved: "true",
                StreetAddress: "false",
                SuiteRequiredButMissing: "true",
              },
            },
          ],
        },
      })
    );
    const { validateAddress } = await import("@/lib/fedex/lib");

    const result = await validateAddress(buildFormData());

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      { code: "ALERT", message: "Be careful" },
      { code: "CM", message: "Customer note" },
      { code: "suite_required", message: "Suite or apartment is required for this address" },
    ]);
  });

  it("returns a helpful error when no resolved address is returned", async () => {
    postMock.mockResolvedValue(
      buildAddressValidationResponse({
        output: { alerts: [], resolvedAddresses: [] },
      })
    );
    const { validateAddress } = await import("@/lib/fedex/lib");

    const result = await validateAddress(buildFormData());
    expect(result).toEqual({
      valid: false,
      issues: [{ code: "no_result", message: "No resolved address returned" }],
    });
  });

  it("returns invalid_response for missing output", async () => {
    postMock.mockResolvedValue({} as any);
    const { validateAddress } = await import("@/lib/fedex/lib");

    const result = await validateAddress(buildFormData());
    expect(result).toEqual({
      valid: false,
      issues: [{ code: "invalid_response", message: "Invalid response from address validation" }],
    });
  });

  it("normalizes thrown errors into a single-line message", async () => {
    postMock.mockRejectedValue("boom\n\n  again");
    const { validateAddress } = await import("@/lib/fedex/lib");

    const result = await validateAddress(buildFormData());
    expect(result).toEqual({
      valid: false,
      issues: [{ code: "error", message: "boom again" }],
    });
  });
});

