/**
 * Delivery & Shipping address management for BERYL Consumer Shopping.
 * Supports persistent 1-time setup for Home and Office destinations.
 */

export interface DeliveryAddress {
  id: "home" | "office";
  type: "home" | "office";
  label: string;
  recipient: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  isDefault?: boolean;
}

export interface AddressBook {
  home: DeliveryAddress;
  office: DeliveryAddress;
  defaultDestination: "home" | "office";
}

export const DEFAULT_ADDRESSES: AddressBook = {
  home: {
    id: "home",
    type: "home",
    label: "Home",
    recipient: "Alex Mercer",
    street: "742 Evergreen Terrace",
    unit: "Apt 4B",
    city: "Springfield",
    state: "OR",
    zip: "97477",
    isDefault: true,
  },
  office: {
    id: "office",
    type: "office",
    label: "Office",
    recipient: "Alex Mercer (Beryl Labs)",
    street: "500 Market Street",
    unit: "Suite 400",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    isDefault: false,
  },
  defaultDestination: "home",
};

const STORAGE_KEY = "beryl_saved_delivery_addresses";

/**
 * Retrieves the saved customer address book from local storage (or returns defaults).
 */
export function getSavedAddresses(): AddressBook {
  if (typeof window === "undefined") {
    return DEFAULT_ADDRESSES;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADDRESSES;
    const parsed = JSON.parse(raw);
    return {
      home: { ...DEFAULT_ADDRESSES.home, ...(parsed.home || {}) },
      office: { ...DEFAULT_ADDRESSES.office, ...(parsed.office || {}) },
      defaultDestination: parsed.defaultDestination || "home",
    };
  } catch {
    return DEFAULT_ADDRESSES;
  }
}

/**
 * Saves customer addresses to persistent local storage.
 */
export function saveAddresses(book: AddressBook): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
  } catch {
    // silent
  }
}

/**
 * Formats a delivery address into a standard 2-line postal format.
 */
export function formatAddressLines(addr: DeliveryAddress): { line1: string; line2: string } {
  const line1 = addr.unit ? `${addr.street}, ${addr.unit}` : addr.street;
  const line2 = `${addr.city}, ${addr.state} ${addr.zip}`;
  return { line1, line2 };
}

/**
 * Resolves whether the user prompted for 'home' vs 'office' (or falls back to default).
 */
export function resolveAddressFromPrompt(
  prompt: string,
  book: AddressBook = DEFAULT_ADDRESSES
): {
  address: DeliveryAddress;
  detectedType: "home" | "office" | "default";
} {
  const lower = prompt.toLowerCase();

  // Explicit check for office / work
  if (
    lower.includes("office") ||
    lower.includes("work") ||
    lower.includes("desk") ||
    lower.includes("workplace") ||
    lower.includes("send at office") ||
    lower.includes("send to office")
  ) {
    return { address: book.office, detectedType: "office" };
  }

  // Explicit check for home
  if (
    lower.includes("home") ||
    lower.includes("house") ||
    lower.includes("apartment") ||
    lower.includes("send at home") ||
    lower.includes("send to home")
  ) {
    return { address: book.home, detectedType: "home" };
  }

  // Fall back to customer's active default destination
  const activeAddr = book[book.defaultDestination] || book.home;
  return { address: activeAddr, detectedType: "default" };
}
