import { createAdminClient } from "@/lib/supabase/admin";
import { ShippingLabelInsert } from "@/lib/supabase/shipping-labels";
import { NextRequest, NextResponse } from "next/server";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/**
 * Shipping address snapshot
 */
interface ShippingAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  residential?: boolean;
}

/**
 * Single label record to write
 */
interface Label {
  trackingNumber: string;
  shipmentCost: number;
  labelData: string;
  shippingAddress: ShippingAddress;
}

/**
 * Request body from order app
 */
interface CreateLabelRequest {
  labels: Label[];
  orderId: string;
  userId: string;
  channel: "uns" | "aquatx";
}

/**
 * API response shape (success or error)
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Validate API key from Authorization header.
 * Format: "Bearer {key}"
 */
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  const expectedKey = process.env.UNS_SHIPPING_LABELS_API_KEY;

  // Guard: env var must be set
  if (!expectedKey) {
    console.error(
      "[LABELS_API] UNS_SHIPPING_LABELS_API_KEY not configured in environment",
    );
    return false;
  }

  // Guard: auth header must be present and match
  if (!authHeader) {
    console.warn("[LABELS_API] Missing Authorization header");
    return false;
  }

  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) {
    console.warn("[LABELS_API] Authorization header missing Bearer prefix");
    return false;
  }

  const providedKey = authHeader.slice(prefix.length);
  console.log("provided: ", providedKey);
  console.log("expected: ", expectedKey);
  const isValid = providedKey === expectedKey;

  if (!isValid) {
    console.warn("[LABELS_API] Invalid API key provided");
  }

  return isValid;
}

/**
 * Validate request body structure
 */
function validateRequestBody(body: unknown): body is CreateLabelRequest {
  if (!body || typeof body !== "object") {
    return false;
  }

  const b = body as Record<string, unknown>;

  // Check required top-level fields
  if (!Array.isArray(b.labels) || typeof b.orderId !== "string") {
    return false;
  }

  // Check labels is not empty
  if (b.labels.length === 0) {
    return false;
  }

  // Check each label has required fields
  return b.labels.every((label: unknown) => {
    if (typeof label !== "object" || label === null) return false;

    const l = label as Record<string, unknown>;

    // Check label fields
    if (
      typeof l.trackingNumber !== "string" ||
      typeof l.shipmentCost !== "number" ||
      typeof l.labelData !== "string"
    ) {
      return false;
    }

    // Check shippingAddress exists and is an object
    if (typeof l.shippingAddress !== "object" || l.shippingAddress === null) {
      return false;
    }

    const addr = l.shippingAddress as Record<string, unknown>;

    // Check required address fields
    return (
      typeof addr.name === "string" &&
      typeof addr.street1 === "string" &&
      typeof addr.city === "string" &&
      typeof addr.state === "string" &&
      typeof addr.postalCode === "string" &&
      typeof addr.country === "string" &&
      typeof addr.phone === "string"
    );
  });
}

// ==========================================
// ROUTE HANDLER
// ==========================================

/**
 * POST /api/labels
 *
 * Create shipping label records in the database.
 * Called by order fulfillment app when labels are generated for aquatx orders.
 *
 * Authentication: Required (API key in Authorization header)
 * Request body: CreateLabelRequest (see TypeScript interface)
 * Response: ApiResponse with success status and records written
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    console.log(`[LABELS_API:${requestId}] Incoming POST request`);

    // ==========================================
    // STEP 1: Validate API Key
    // ==========================================

    if (!validateApiKey(request)) {
      console.warn(`[LABELS_API:${requestId}] API key validation failed`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Unauthorized: Invalid or missing API key",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    console.log(`[LABELS_API:${requestId}] API key validated`);

    // ==========================================
    // STEP 2: Parse Request Body
    // ==========================================

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`[LABELS_API:${requestId}] Invalid JSON in request body`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Bad Request: Invalid JSON",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // ==========================================
    // STEP 3: Validate Request Shape
    // ==========================================

    if (!validateRequestBody(body)) {
      console.error(
        `[LABELS_API:${requestId}] Request body validation failed. Received:`,
        JSON.stringify(body),
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error:
            "Bad Request: Invalid request format. Expected { labels: [...], orderId: number, channel: string }",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const { labels, orderId, userId, channel } = body;

    console.log(
      `[LABELS_API:${requestId}] Request validated: ${labels.length} labels for order ${orderId} (channel: ${channel})`,
    );

    // ==========================================
    // STEP 4: Create Database Client
    // ==========================================

    let supabase;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      supabase = createAdminClient();

      console.log(`[LABELS_API:${requestId}] Supabase client initialized`);
    } catch (error) {
      console.error(
        `[LABELS_API:${requestId}] Failed to initialize Supabase client:`,
        error,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Server Error: Failed to initialize database connection",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    // ==========================================
    // STEP 5: Transform Labels to DB Format
    // ==========================================

    const records = labels.map((label: Label) => ({
      tracking_number: label.trackingNumber,
      shipment_cost: label.shipmentCost,
      order_number: orderId,
      label_data_base64: label.labelData,
    }));

    console.log(
      `[LABELS_API:${requestId}] Transformed ${records.length} records for insertion`,
    );

    // ==========================================
    // STEP 6: Insert Records
    // ==========================================

    const recordsToInsert: ShippingLabelInsert[] = labels.map(
      (label: Label) => ({
        user_id: userId,
        to_address_id: null,
        voided_at: null,
        paid_at: null,
        ship_to_snapshot: {
          name: label.shippingAddress.name,
          company: label.shippingAddress.company || null,
          street1: label.shippingAddress.street1,
          street2: label.shippingAddress.street2 || null,
          city: label.shippingAddress.city,
          state: label.shippingAddress.state,
          postalCode: label.shippingAddress.postalCode,
          country: label.shippingAddress.country,
          phone: label.shippingAddress.phone,
          residential: label.shippingAddress.residential ?? false,
        },
        tracking_number: label.trackingNumber,
        total_shipment_cost: label.shipmentCost,
        shipment_cost: label.shipmentCost,
        order_number: orderId,
        label_data_base64: label.labelData,
        carrier_code: "external",
        service_code: "external",
        package_code: null,
        length: 0,
        width: 0,
        height: 0,
        units: "inches" as const,
        weight_value: 0,
        weight_unit: "lb",
        confirmation: null,
        insurance_cost: 0,
        total_insurance_cost: 0,
        shipment_id: 0,
        is_address_validated: false,
      }),
    );

    const { data, error } = await supabase
      .from("shipping_labels")
      .insert(recordsToInsert)
      .select(
        "id, tracking_number, total_shipment_cost, order_number, created_at",
      );

    if (error) {
      console.error(
        `[LABELS_API:${requestId}] Database insert failed:`,
        error.message,
      );
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Database Error: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    // ==========================================
    // STEP 7: Log Success and Return
    // ==========================================

    const duration = Date.now() - startTime;
    console.log(
      `[LABELS_API:${requestId}] ✓ Success: ${data?.length || 0} labels inserted in ${duration}ms`,
    );

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          recordsWritten: data?.length || 0,
          labels: data || [],
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error(
      `[LABELS_API:${requestId}] ✗ Unexpected error in ${duration}ms:`,
      message,
    );

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: `Server Error: ${message}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Handle unsupported HTTP methods (GET, DELETE, etc.)
 */
export async function GET() {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: "Method Not Allowed: Use POST to create labels",
      timestamp: new Date().toISOString(),
    },
    { status: 405 },
  );
}
