"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import type { SavedAddress } from "@/lib/addresses";
import { addressSchema } from "@/lib/validation";

const savedAddressSchema = z.object({
  id: z.number(),
  label: z.string().nullable(),
  fullName: z.string(),
  phone: z.string().nullable(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string(),
  isDefault: z.boolean(),
});

const mutationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  address: savedAddressSchema.optional(),
  addressId: z.number().optional(),
  defaultAddressId: z.number().nullable().optional(),
});

type AddressFormValues = {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

const emptyAddress: AddressFormValues = {
  label: "Home",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  isDefault: false,
};

function toFormValues(address: SavedAddress): AddressFormValues {
  return {
    label: address.label ?? "",
    fullName: address.fullName,
    phone: address.phone ?? "",
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country,
    isDefault: address.isDefault,
  };
}

export default function CustomerAddressBook({
  initialAddresses,
}: {
  initialAddresses: SavedAddress[];
}) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [formValues, setFormValues] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startNewAddress() {
    setEditingAddressId(null);
    setFormValues({
      ...emptyAddress,
      isDefault: addresses.length === 0,
    });
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  function startEditing(address: SavedAddress) {
    setEditingAddressId(address.id);
    setFormValues(toFormValues(address));
    setFormOpen(true);
    setMessage("");
    setError("");
  }

  function closeForm() {
    setFormOpen(false);
    setEditingAddressId(null);
    setFormValues(emptyAddress);
  }

  function updateDefaultAddress(addressId: number | null) {
    if (addressId === null) return;
    setAddresses((current) =>
      current.map((address) => ({
        ...address,
        isDefault: address.id === addressId,
      })),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const parsedInput = addressSchema.safeParse(formValues);
    if (!parsedInput.success) {
      setError(parsedInput.error.issues[0]?.message ?? "Check the address details.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        editingAddressId === null
          ? "/api/account/addresses"
          : `/api/account/addresses/${editingAddressId}`,
        {
          method: editingAddressId === null ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(parsedInput.data),
        },
      );
      const payload: unknown = await response.json();
      const result = mutationResponseSchema.safeParse(payload);

      if (!response.ok || !result.success || !result.data.success || !result.data.address) {
        setError(
          result.success
            ? result.data.message ?? "Unable to save the address."
            : "The server returned an unexpected response.",
        );
        return;
      }

      const savedAddress = result.data.address;
      setAddresses((current) => {
        const exists = current.some((address) => address.id === savedAddress.id);
        const next = exists
          ? current.map((address) =>
              address.id === savedAddress.id ? savedAddress : address,
            )
          : [savedAddress, ...current];
        if (result.data.defaultAddressId !== undefined) {
          return next.map((address) => ({
            ...address,
            isDefault: address.id === result.data.defaultAddressId,
          }));
        }
        if (savedAddress.isDefault) {
          return next.map((address) => ({
            ...address,
            isDefault: address.id === savedAddress.id,
          }));
        }
        return next;
      });
      setMessage(result.data.message ?? "Address saved.");
      closeForm();
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(address: SavedAddress) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...toFormValues(address), isDefault: true }),
      });
      const payload: unknown = await response.json();
      const result = mutationResponseSchema.safeParse(payload);
      if (!response.ok || !result.success || !result.data.success) {
        setError(
          result.success
            ? result.data.message ?? "Unable to update the default address."
            : "The server returned an unexpected response.",
        );
        return;
      }

      updateDefaultAddress(result.data.defaultAddressId ?? address.id);
      setMessage(result.data.message ?? "Default address updated.");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(address: SavedAddress) {
    if (!window.confirm(`Remove the ${address.label || "saved"} address?`)) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload: unknown = await response.json();
      const result = mutationResponseSchema.safeParse(payload);
      if (!response.ok || !result.success || !result.data.success) {
        setError(
          result.success
            ? result.data.message ?? "Unable to remove the address."
            : "The server returned an unexpected response.",
        );
        return;
      }

      setAddresses((current) =>
        current
          .filter((item) => item.id !== address.id)
          .map((item) => ({
            ...item,
            isDefault: item.id === result.data.defaultAddressId,
          })),
      );
      setMessage(result.data.message ?? "Address removed.");
      if (editingAddressId === address.id) closeForm();
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="saved-addresses-heading"
      className="rounded-3xl border border-[#E3D8C9] bg-[#FAF7F2] p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Delivery details</p>
          <h2
            id="saved-addresses-heading"
            className="serif-display mt-2 text-3xl text-[#1E1B18]"
          >
            Saved addresses
          </h2>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={startNewAddress}
            disabled={busy}
            className="min-h-11 rounded-full bg-[#1E1B18] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33] disabled:opacity-60"
          >
            ADD ADDRESS
          </button>
        )}
      </div>

      {message && (
        <p className="mt-4 text-sm text-[#1E1B18]" aria-live="polite">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-[#9b5545]" role="alert">
          {error}
        </p>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="address-label" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Address label
            </label>
            <input
              id="address-label"
              maxLength={80}
              placeholder="Home, work..."
              value={formValues.label}
              onChange={(event) => setFormValues({ ...formValues, label: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-name" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Recipient name
            </label>
            <input
              id="address-name"
              required
              autoComplete="name"
              maxLength={120}
              value={formValues.fullName}
              onChange={(event) => setFormValues({ ...formValues, fullName: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-phone" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Phone <span className="font-normal text-[#6E655F]">(optional)</span>
            </label>
            <input
              id="address-phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={formValues.phone}
              onChange={(event) => setFormValues({ ...formValues, phone: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address-line-1" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Street address
            </label>
            <input
              id="address-line-1"
              required
              autoComplete="address-line1"
              maxLength={255}
              value={formValues.addressLine1}
              onChange={(event) => setFormValues({ ...formValues, addressLine1: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address-line-2" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Apartment, suite, etc. <span className="font-normal text-[#6E655F]">(optional)</span>
            </label>
            <input
              id="address-line-2"
              autoComplete="address-line2"
              maxLength={255}
              value={formValues.addressLine2}
              onChange={(event) => setFormValues({ ...formValues, addressLine2: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-city" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              City
            </label>
            <input
              id="address-city"
              required
              autoComplete="address-level2"
              maxLength={100}
              value={formValues.city}
              onChange={(event) => setFormValues({ ...formValues, city: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-state" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              State / region <span className="font-normal text-[#6E655F]">(optional)</span>
            </label>
            <input
              id="address-state"
              autoComplete="address-level1"
              maxLength={100}
              value={formValues.state}
              onChange={(event) => setFormValues({ ...formValues, state: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-postal" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Postal code <span className="font-normal text-[#6E655F]">(optional)</span>
            </label>
            <input
              id="address-postal"
              autoComplete="postal-code"
              maxLength={25}
              value={formValues.postalCode}
              onChange={(event) => setFormValues({ ...formValues, postalCode: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address-country" className="mb-1.5 block text-xs font-medium text-[#6E655F]">
              Country
            </label>
            <input
              id="address-country"
              required
              autoComplete="country-name"
              maxLength={100}
              value={formValues.country}
              onChange={(event) => setFormValues({ ...formValues, country: event.target.value })}
              className="min-h-11 w-full border border-[#E3D8C9] bg-white px-3 text-sm"
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-[#6E655F] sm:col-span-2">
            <input
              type="checkbox"
              checked={formValues.isDefault}
              onChange={(event) => setFormValues({ ...formValues, isDefault: event.target.checked })}
              className="size-4 accent-[#1E1B18]"
            />
            Make this my default shipping address
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 bg-[#1E1B18] px-5 text-xs font-semibold tracking-[0.1em] text-white transition-colors hover:bg-[#9A3F33] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "SAVING…" : editingAddressId === null ? "SAVE ADDRESS" : "UPDATE ADDRESS"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="min-h-11 border border-[#E3D8C9] px-5 text-xs font-semibold tracking-[0.1em] text-[#1E1B18] disabled:opacity-60"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !formOpen ? (
        <p className="mt-6 text-sm text-[#6E655F]">
          You have not saved a delivery address yet.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-2xl border border-[#E3D8C9] bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-[#1E1B18]">
                  {address.label || "Saved address"}
                </h3>
                {address.isDefault && (
                  <span className="rounded-full bg-[#B85042] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6E655F]">
                <span className="font-medium text-[#1E1B18]">{address.fullName}</span>
                <br />
                {address.addressLine1}
                {address.addressLine2 && <><br />{address.addressLine2}</>}
                <br />
                {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                <br />
                {address.country}
                {address.phone && <><br />{address.phone}</>}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold tracking-[0.08em]">
                <button
                  type="button"
                  onClick={() => startEditing(address)}
                  disabled={busy}
                  className="min-h-8 text-[#1E1B18] underline-offset-4 hover:underline disabled:opacity-50"
                >
                  EDIT
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(address)}
                    disabled={busy}
                    className="min-h-8 text-[#1E1B18] underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    MAKE DEFAULT
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAddress(address)}
                  disabled={busy}
                  className="min-h-8 text-[#9b5545] underline-offset-4 hover:underline disabled:opacity-50"
                >
                  REMOVE
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
