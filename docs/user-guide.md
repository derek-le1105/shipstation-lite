# UNS Shipping Manager — User Guide

This guide is written for anyone who uses the UNS Shipping Manager day-to-day — no technical background required.

---

## What is UNS Shipping Manager?

UNS Shipping Manager is a web application that lets you create, track, and manage FedEx shipping labels. Instead of juggling spreadsheets or navigating carrier websites, you can:

- Build a shipping label in minutes using a guided step-by-step form
- Save your commonly used addresses and box sizes for fast reuse
- View and download all past labels in one place
- (Admins) Oversee all labels and users across the workspace

---

## Getting Started

### Logging In

1. Go to the application URL provided by your administrator.
2. Enter your email address and password, then click **Sign In**.
3. If you forgot your password, click **Forgot password?** and follow the email instructions.

> Your account must be created by an administrator. Contact them if you do not have login credentials.

---

## Your Dashboard

After logging in you land on the **Dashboard** — your home base for creating labels and managing your saved data.

The left sidebar has four main sections:

| Section | What it does |
|---------|-------------|
| **Dashboard** | Create a new shipping label |
| **Labels** | View and manage all your past labels |
| **Addresses** | Save and manage reusable ship-to and ship-from addresses |
| **Packages** | Save and manage reusable box or package sizes |

---

## Creating a Shipping Label

Click **Dashboard** in the sidebar. The label creation form walks you through four steps.

### Step 1 — Addresses

**Ship From**

Click the **Ship From** field and choose a saved address, or type a new one. This is where the package originates.

**Ship To**

Fill in the recipient's name, company (optional), phone, email, and address. You can also pick a saved address from your address book.

- Toggle **Residential address** if the destination is a home, not a business.
- If FedEx address validation is enabled, the app will flag any issues with the address before you continue.

Click **Next** when both addresses look correct.

---

### Step 2 — Package Details

Add at least one package. For each package you can:

- Select a saved package template or enter custom dimensions (length × width × height).
- Enter the weight.
- Choose dimension units (inches or centimeters) and weight units (ounces or pounds).

**Multiple packages in one shipment**

Click **Add Package** to include more boxes in the same label order. Each package can have different dimensions and weights.

Click **Next** when all packages are configured.

---

### Step 3 — Rates

The app fetches available FedEx shipping rates based on your addresses and packages.

You will see a list of service options (for example, FedEx Ground, FedEx 2Day, FedEx Priority Overnight) with prices. Prices shown already include any upcharges configured by your administrator.

Select the service that fits your needs, then click **Next**.

---

### Step 4 — Review & Create

Review a summary of:

- Ship-from and ship-to addresses
- Package dimensions and weights
- Selected carrier service and total cost

If everything looks correct, click **Create Label**. The label will be generated and you'll see a success confirmation with:

- A **tracking number**
- A button to **download the label PDF**

---

## Managing Your Labels

Go to **Labels** in the sidebar to see all shipping labels you have created.

### Filtering and Searching

- Use the **date range picker** to filter labels by creation date.
- Use the **status filter** to show only active or voided labels.

### Downloading a Label

Click the download icon next to any label to get the PDF. Print this and attach it to your package.

### Voiding a Label

If you created a label by mistake or a shipment was cancelled, you can void it. Find the label in the table, open its action menu (⋮), and select **Void Label**.

> Voided labels cannot be used for shipping and are marked with a "Voided" status. Refund eligibility depends on your ShipStation account terms.

---

## Managing Saved Addresses

Go to **Addresses** in the sidebar.

### Adding an Address

Click **Add Address**, fill in the details, and save. Provide a short **label** (e.g. "Main Warehouse") so you can identify it quickly in the label form.

### Editing or Deleting an Address

Use the action menu (⋮) next to any address to edit or delete it. Deleting an address does not affect any labels already created with it.

---

## Managing Saved Packages

Go to **Packages** in the sidebar.

### Adding a Package Template

Click **Add Package**, enter the dimensions and weight, and give it a nickname (e.g. "Small Box 10×8×4"). Click **Save**.

### Editing or Deleting a Package

Use the action menu (⋮) next to any package to edit or delete it.

---

## Your Account Settings

Click your name or avatar at the bottom of the sidebar, then select **Account**.

Here you can:

- Update your display name
- Change your password
- Change your email address

---

## Submitting Feedback

If you encounter a problem or have a suggestion, click the **Feedback** link (usually in the sidebar or header). Describe the issue, choose a category, and submit. Your administrator will be notified.

---

## Frequently Asked Questions

**Can I create a label without a saved address?**
Yes. You can type any address directly in the label form without saving it first.

**Can I ship with carriers other than FedEx?**
The application currently focuses on FedEx services via ShipStation. Other carriers may appear depending on your ShipStation account configuration.

**Why don't I see a rate for the service I want?**
Rates are returned based on your ShipStation account's enabled carriers and services. Contact your administrator if a service you expect is missing.

**How do I get a new account?**
Ask your workspace administrator to create one for you.

**My label PDF won't download — what should I do?**
Try a different browser or disable any pop-up blockers. If the problem persists, contact your administrator.

---

## Admin Guide

> This section is for workspace administrators only.

Administrators have access to an additional **Admin** area in the sidebar.

### Admin Dashboard

The admin home page shows workspace-wide metrics: total labels created, active users, and recent activity.

### Managing Users (`/admin/users`)

- View all registered users and their roles.
- Promote a user to **Admin** or demote an admin back to **User**.
- Configure a **shipping upcharge** per user (a flat dollar amount or percentage added to every rate shown to that user).
- Invite new users via email.

### Viewing All Labels (`/admin/labels`)

See every label created by every user. You can filter by date range and status, and void labels on behalf of any user.

### Viewing All Addresses (`/admin/addresses`)

See every saved address across all users. Useful for auditing or cleaning up stale data.

---

## Glossary

| Term | Meaning |
|------|---------|
| **Label** | A printable shipping document with a barcode and tracking number |
| **Carrier** | The shipping company (e.g. FedEx) |
| **Service** | A specific shipping speed offered by a carrier (e.g. FedEx Ground) |
| **Upcharge** | An additional fee added to the base shipping rate by your administrator |
| **Voided** | A label that has been cancelled and is no longer valid for shipping |
| **RLS** | Row-Level Security — a database feature ensuring each user only sees their own data |
| **Tracking number** | A unique code used to track a package's journey from sender to recipient |
