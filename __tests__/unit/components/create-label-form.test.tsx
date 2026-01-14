import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateLabelForm } from "@/components/shipping/create-label-form";
import CreateLabelWizard from "@/components/shipping/create-label-wizard";
import { createShippingLabelAction } from "@/lib/actions/shipping";
import { buildAddressRecord, buildWarehouseRecord } from "../utils";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: "UNS-SM-1",
    isPending: false,
    error: null,
  })),
  QueryClient: class QueryClient { },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("@/lib/actions/shipping", () => ({
  createShippingLabelAction: vi.fn(
    async (_state: any, _formData: FormData) => ({
      status: "success" as const,
      message: "All labels created successfully.",
      items: [
        {
          index: 0,
          ok: true as const,
          savedLabel: {
            id: "label-1",
            tracking_number: "TRACK123",
            label_data_base64: "base64pdf",
          } as any,
          shipStationLabel: {
            shipmentId: 123,
          } as any,
        },
      ],
    })
  ),
}));



describe("CreateLabelForm", () => {
  function renderForm() {
    render(
      <CreateLabelForm
        shipFrom={buildWarehouseRecord()}
        toAddresses={[buildAddressRecord({ id: "addr-2" })]}
        carriers={[{ code: "fedex", name: "FedEx" } as any]}
        services={
          [
            {
              code: "fedex_ground",
              carrierCode: "fedex",
              name: "FedEx Ground",
            },
          ] as any
        }
        packages={[]}
      />
    );
  }

  it("submits using createShippingLabelAction and renders success response", async () => {
    renderForm();

    const form = document.getElementById(
      "create-label-form"
    ) as HTMLFormElement | null;
    expect(form).not.toBeNull();

    if (!form) return;

    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(createShippingLabelAction)).toHaveBeenCalledTimes(1);
    });

    await screen.findByText("Label created successfully.");
  });
});

describe("CreateLabelWizard", () => {
  function renderForm() {
    render(
      <CreateLabelWizard
        shipFrom={buildWarehouseRecord()}
        toAddresses={[buildAddressRecord({ id: "addr-2" })]}
        carriers={[{ code: "fedex", name: "FedEx" } as any]}
        services={
          [
            {
              code: "fedex_ground",
              carrierCode: "fedex",
              name: "FedEx Ground",
            },
          ] as any
        }
        packages={[]}
      />
    );
  }

  it("submits using createShippingLabelAction and renders success response", async () => {
    renderForm();

    const form = document.getElementById(
      "create-label-form"
    ) as HTMLFormElement | null;
    expect(form).not.toBeNull();

    if (!form) return;

    fireEvent.submit(form);

    await waitFor(() => {
      expect(vi.mocked(createShippingLabelAction)).toHaveBeenCalledTimes(1);
    });

    await screen.findByText("Label created successfully.");
  });
});
