# Account Contact Manager — Salesforce LWC Project

A custom Salesforce Lightning Web Component (LWC) application that lets users view, browse, and inline-edit Account and Contact records from a single page — no page reloads required.

---

## What Does This Project Do?

This project builds a custom app inside Salesforce that shows a list of **Accounts** along with all their related **Contacts**. Users can:

- Browse through all accounts using **pagination** (choose how many records to show per page)
- **Expand** any account row to see its contacts listed below it
- **Inline-edit** any field directly in the table by clicking on it — no need to open a separate edit form
- **Save** changes one row at a time, or save all pending changes at once with the "Save All Changes" button

---

## Project Structure

```
force-app/main/default/
│
├── lwc/
│   └── accountContactManager/          ← The main Lightning Web Component
│       ├── accountContactManager.html  ← What the user sees (the template/UI)
│       ├── accountContactManager.js    ← The logic (JavaScript controller)
│       ├── accountContactManager.css   ← Styling
│       └── accountContactManager.js-meta.xml  ← Tells Salesforce where this component can be used
│
├── classes/
│   ├── AccountContactController.cls        ← Apex class: fetches and saves data
│   └── AccountContactControllerTest.cls    ← Test class: verifies the Apex logic works
│
├── applications/
│   └── AccountContactApp.app-meta.xml  ← Defines the custom Lightning App
│
├── flexipages/
│   └── AccountContactManagerPage.flexipage-meta.xml  ← The page layout that hosts the component
│
├── tabs/
│   └── AccountContactManager.tab-meta.xml  ← The custom tab that links to the page
│
└── permissionsets/
    └── Account_Contact_Manager_PS.permissionset-meta.xml  ← Controls who can access this app
```

---

## Key Concepts Explained (for beginners)

### What is LWC?
**Lightning Web Component (LWC)** is Salesforce's modern framework for building UI components. Think of it like building a small web page using HTML, JavaScript, and CSS — but it lives inside Salesforce.

Every LWC has three main files:
- `.html` — the structure of what the user sees
- `.js` — the behaviour (what happens when a user clicks, types, etc.)
- `.css` — the visual styling (colours, spacing, fonts)

### What is an Apex Class?
**Apex** is Salesforce's server-side programming language (similar to Java). When the LWC needs data from the database, it calls an Apex method. In this project, `AccountContactController.cls` handles:
- **Fetching** accounts and their contacts with pagination support
- **Saving** changes made to accounts or contacts

### What is a FlexiPage?
A **FlexiPage** (Flexible Page) is a page layout in Salesforce that you configure in the Lightning App Builder. It defines which components appear on a page and where. In this project, `AccountContactManagerPage` hosts the `accountContactManager` LWC.

### What is a Permission Set?
A **Permission Set** is a collection of settings that grant users access to specific features. Instead of changing a user's entire profile, you assign a Permission Set to give them just the access they need. The `Account_Contact_Manager_PS` permission set grants:
- Visibility of the custom app and tab
- Access to run the Apex controller
- Read and edit permissions on Account and Contact fields

---

## How the Component Works

### 1. Loading Data
When the page loads, the component calls the Apex method `getAccountsWithContacts` which runs a SOQL query like this:

```sql
SELECT Id, Name, Phone, Industry, AnnualRevenue,
    (SELECT Id, FirstName, LastName, Email, Phone, Title FROM Contacts)
FROM Account
ORDER BY Name
LIMIT 10 OFFSET 0
```

This fetches 10 accounts at a time (pagination), each with their related contacts.

### 2. Displaying Data
The accounts are shown in a table. Each row has:
- A **chevron button** (▶) to expand/collapse the contacts for that account
- The account's **Name, Phone, Industry, and Annual Revenue** fields
- A **contact count badge** showing how many contacts the account has

When expanded, the contacts appear as sub-rows below their parent account, showing **First Name, Last Name, Email, Phone, and Title**.

### 3. Inline Editing
Clicking any cell in the table makes it editable. The cell switches from plain text to an input field. A **pencil icon** appears on hover to hint that a cell is editable.

Changes are tracked as "drafts" in memory. A row with unsaved changes shows an **amber left border** and a warning icon.

Each row has **Save (✓)** and **Cancel (✗)** buttons that appear when editing. The "Save All Changes" button in the card header saves every pending change in one go.

### 4. Pagination
At the top and bottom of the table there are **Previous / Next** buttons and a **rows-per-page** dropdown (5, 10, 20, or 50). The total record count and current page number are displayed between the buttons.

---

## Files Deep Dive

### `AccountContactController.cls`

```
getAccountsWithContacts(pageSize, pageNumber)
  → Returns a map with:
      - "accounts"   : list of Account records (with related Contacts)
      - "totalCount" : total number of Account records in the org

saveRecords(accounts, contacts)
  → Accepts lists of modified Account and/or Contact records and saves them to the database
```

### `AccountContactControllerTest.cls`

Contains **18 test methods** that verify the Apex logic works correctly:

| Test Group | What it checks |
|---|---|
| Pagination tests | First page, second page, page beyond data, small page size |
| Data integrity tests | Contacts are included, result map keys are correct, total count is accurate |
| Save account tests | Name, phone, industry, annual revenue can be updated |
| Save contact tests | Fields and email can be updated |
| Combined save | Both accounts and contacts can be saved together |
| Bulk save | Multiple records saved at once |
| Edge case tests | Null inputs, empty lists, mixed null/empty inputs |

---

## Setup & Deployment

### Prerequisites
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) installed
- A Salesforce org authenticated (Dev Hub or sandbox)

### Step 1 — Authenticate your org
```bash
sf org login web --alias myOrg
```

### Step 2 — Deploy all metadata
```bash
sf project deploy start --source-dir force-app --target-org myOrg
```

### Step 3 — Assign the permission set to yourself
```bash
sf org assign permset --name Account_Contact_Manager_PS --target-org myOrg
```

### Step 4 — Open the app
```bash
sf org open --target-org myOrg
```
Then navigate to the **App Launcher** (the 9-dot grid icon) and search for **"Account Contact Manager"**.

---

## How Inline Editing Works (Technical Detail)

The component uses a **draft values pattern**:

1. When a user clicks a cell, the row switches to edit mode (`isEditing = true`)
2. Any changes are stored in a JavaScript object called `accountDrafts` or `contactDrafts` — they are **not** sent to the server yet
3. The `processedAccounts` getter merges the original data with any drafts before rendering, so the user sees their changes immediately
4. When Save is clicked, only the changed fields are sent to the Apex `saveRecords` method
5. On success, the draft is cleared and the data is refreshed from the server

This means if you cancel, your changes are thrown away and the original data is restored — nothing was ever written to the database.

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---|---|---|
| "Cannot read properties of undefined" | Contact sub-query data format mismatch | Already handled by the `getContactRecords()` normaliser in the JS |
| App not visible in App Launcher | Permission set not assigned | Assign `Account_Contact_Manager_PS` to the user |
| Apex test failures | Org validation rules require extra fields | Add the required fields to test data in `AccountContactControllerTest.cls` |
| Inline edits not saving | User lacks edit permission on the object | Check the permission set's object permissions |

---

## Technologies Used

| Technology | Purpose |
|---|---|
| Lightning Web Components (LWC) | Frontend UI |
| Apex | Backend data access and DML |
| SOQL | Querying Account and Contact records |
| SLDS (Salesforce Lightning Design System) | Styling and layout |
| Salesforce Metadata API | Deploying the app, tab, page, and permission set |
