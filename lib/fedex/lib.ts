"use server";

import FedExClient from "./client";
import { AddressValidationResponse } from "./types";

export async function validateAddress(formData: FormData) {
  try {
    const fedexClient = new FedExClient();
    const street1 = formData.get("address_line1") as string;
    const street2 = formData.get("address_line2") as string;
    const city = formData.get("city") as string;
    const stateOrProvinceCode = formData.get("state") as string;
    const postalCode = formData.get("postal_code") as string;
    const countryCode = formData.get("country") as string;

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
    if (!response || !response.output) {
      throw new Error("Invalid response from address validation");
    }

    const { resolvedAddresses, alerts } = response.output;
    if (alerts && alerts.length > 0) {
      console.log("Address validation alerts:", alerts);
    }
    console.log("Resolved addresses:", resolvedAddresses[0]);
    if (resolvedAddresses[0].customerMessages.length <= 0)
      return { valid: true, issues: [] };
    return { valid: false, issues: resolvedAddresses[0].customerMessages };
  } catch (error) {
    if (error instanceof Error) {
      console.log("Address validation error:", JSON.stringify(error.message));
    }

    return { valid: false, issues: [] };
  }
}
