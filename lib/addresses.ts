export const savedAddressColumns =
  "id, label, full_name, phone, address_line_1, address_line_2, city, state, postal_code, country, is_default";

export type SavedAddress = {
  id: number;
  label: string | null;
  fullName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
};

export function serializeSavedAddress(row: Record<string, unknown>): SavedAddress {
  return {
    id: Number(row.id),
    label: typeof row.label === "string" ? row.label : null,
    fullName: String(row.full_name ?? ""),
    phone: typeof row.phone === "string" ? row.phone : null,
    addressLine1: String(row.address_line_1 ?? ""),
    addressLine2: typeof row.address_line_2 === "string" ? row.address_line_2 : null,
    city: String(row.city ?? ""),
    state: typeof row.state === "string" ? row.state : null,
    postalCode: typeof row.postal_code === "string" ? row.postal_code : null,
    country: String(row.country ?? ""),
    isDefault: Boolean(row.is_default),
  };
}
