/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import FedExClient from "./client";
import { AddressValidationResponse } from "./types";

export type AddressValidationIssue = {
  code: string;
  message: string;
};

export type AddressValidationSummary = {
  valid: boolean;
  issues: AddressValidationIssue[];
  normalized?: {
    streetLines: string[];
    city: string;
    stateOrProvinceCode: string;
    postalCode?: string;
    countryCode: string;
    classification?: string;
  };
};

// Summarize FedEx Address Validation response into concise, actionable info
function summarizeAddressValidation(
  response: AddressValidationResponse
): AddressValidationSummary {
  if (!response || !response.output) {
    return {
      valid: false,
      issues: [
        {
          code: "invalid_response",
          message: "Invalid response from address validation",
        },
      ],
    };
  }

  const alerts = (response.output.alerts || []).map((a: any) => ({
    code: String(a?.code ?? "alert"),
    message: String(a?.message ?? "Address alert"),
  }));

  const first = response.output.resolvedAddresses?.[0] as any;
  if (!first) {
    return {
      valid: false,
      issues: alerts.length
        ? alerts
        : [{ code: "no_result", message: "No resolved address returned" }],
    };
  }

  const issues: AddressValidationIssue[] = [];

  // Include any customer messages
  const customerMessages = (first.customerMessages || [])
    .filter(Boolean)
    .map((m: any) => ({
      code: String(m?.code ?? "msg"),
      message: String(m?.message ?? "Message"),
    }));
  issues.push(...customerMessages);

  // Map attributes to concise, helpful guidance
  const attr = (first.attributes || {}) as Record<string, any>;
  console.log("attr: ", attr);
  if (attr.SuiteRequiredButMissing === "true") {
    issues.push({
      code: "suite_required",
      message: "Suite or apartment is required for this address",
    });
  }
  if (attr.InvalidSuiteNumber === "true") {
    issues.push({
      code: "invalid_suite",
      message: "The suite/apartment number appears invalid",
    });
  }
  if (attr.MultipleMatches === "true") {
    issues.push({
      code: "ambiguous",
      message: "Multiple possible matches; add unit or more detail",
    });
  }
  if (attr.POBoxOnlyZIP === "true") {
    issues.push({
      code: "po_box_only_zip",
      message: "ZIP is PO Box-only; street delivery may not be available",
    });
  }
  if ((first.postOfficeBox || attr.POBox) === "true") {
    issues.push({
      code: "po_box",
      message: "Address looks like a PO Box; some services may not deliver",
    });
  }
  if (attr.CountrySupported === "false") {
    issues.push({
      code: "country_unsupported",
      message: "Country not supported by FedEx address validation",
    });
  }
  if (attr.ValidlyFormed === "false") {
    issues.push({
      code: "invalid_format",
      message:
        "Address appears malformed. Check street, city, state, and postal code",
    });
  }
  if (attr.ZIP4Match === "false") {
    issues.push({
      code: "zip4_mismatch",
      message: "ZIP+4 does not match the street/unit",
    });
  }
  if (attr.ZIP11Match === "false") {
    issues.push({
      code: "zip11_mismatch",
      message: "ZIP+4+delivery point does not match the street/unit",
    });
  }

  // Consider DPV + Matched + Resolved as a strong signal of validity
  const dpv = Boolean(attr.DPV === "true");
  const matched = attr.Matched !== "false"; // default to true if missing
  const resolved = attr.Resolved !== "false"; // default to true if missing

  const blockingIssues = [
    attr.SuiteRequiredButMissing === "true",
    attr.InvalidSuiteNumber === "true",
    attr.MultipleMatches === "true",
    attr.ValidlyFormed === "false",
    attr.CountrySupported === "false",
  ].some(Boolean);

  const valid = dpv && matched && resolved && !blockingIssues;

  const normalizedPostal = (() => {
    const base = first?.parsedPostalCode?.base || first?.postalCodeToken?.value;
    const addOn = first?.parsedPostalCode?.addOn;
    return base && addOn ? `${base}-${addOn}` : base;
  })();

  const normalized = {
    streetLines: Array.isArray(first?.streetLinesToken)
      ? first.streetLinesToken
      : [],
    city: String(first?.city || ""),
    stateOrProvinceCode: String(first?.stateOrProvinceCode || ""),
    postalCode: normalizedPostal,
    countryCode: String(first?.countryCode || ""),
    classification: first?.classification,
  };

  // If no issues and valid, keep response minimal
  if (valid && issues.length === 0 && alerts.length === 0) {
    return { valid: true, issues: [], normalized };
  }

  return {
    valid,
    issues: [...alerts, ...issues].length
      ? [...alerts, ...issues]
      : [{ code: "unknown_issue", message: "Address could not be validated" }],
    normalized,
  };
}

export async function validateAddress(formData: FormData) {
  try {
    const fedexClient = new FedExClient();
    const street1 = formData.get("address_line1") as string;
    const street2 = formData.get("address_line2") as string;
    const city = formData.get("city") as string;
    const stateOrProvinceCode = formData.get("state") as string;
    const postalCode = formData.get("postal_code") as string;
    const countryCode = "US";
    const streetLines = street2 ? [street1, street2] : [street1];
    const address = {
      streetLines,
      city,
      stateOrProvinceCode,
      postalCode,
      countryCode,
    };

    const response = await fedexClient.post<AddressValidationResponse>(
      "/address/v1/addresses/resolve",
      {
        addressesToValidate: [{ address }],
      }
    );
    const summary = summarizeAddressValidation(response);
    return summary;
  } catch (error) {
    const message = (() => {
      const raw = error instanceof Error ? error.message : String(error);
      const oneLine = raw.replace(/\s+/g, " ").trim();
      return oneLine.length > 200 ? `${oneLine.slice(0, 197)}...` : oneLine;
    })();
    return {
      valid: false,
      issues: [
        {
          code: "error",
          message,
        },
      ],
    };
  }
}
