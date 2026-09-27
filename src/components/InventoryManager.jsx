import { useMemo, useState } from "react";
import { supabase } from "../createClient";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

const safeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const makeInitialForm = (categories) => ({
  name: "",
  category: categories[0] || "Other",
  quantity: "1",
  min_quantity: "1",
  unit: "piece",
  location: "",
  expiry_date: "",
  notes: "",
});

export default function InventoryManager({
  tableName,
  title,
  description,
  icon: Icon,
  items = [],
  setItems,
  categories,
  canManage = true,
  onDataChanged,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() =>
    makeInitialForm(categories),
  );

  const filteredItems = useMemo(() => {
    const query = safeText(searchTerm);

    return items.filter((item) => {
      if (!query) return true;

      return [
        item.name,
        item.category,
        item.location,
        item.unit,
        item.notes,
      ]
        .filter(Boolean)
        .map(safeText)
        .join(" ")
        .includes(query);
    });
  }, [items, searchTerm]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(makeInitialForm(categories));
    setError("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      category: item.category || categories[0] || "Other",
      quantity: String(item.quantity ?? "1"),
      min_quantity: String(item.min_quantity ?? "1"),
      unit: item.unit || "piece",
      location: item.location || "",
      expiry_date: item.expiry_date
        ? String(item.expiry_date).slice(0, 10)
        : "",
      notes: item.notes || "",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingItem(null);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const minQuantity = Number(form.min_quantity);

    if (!name) {
      setError("Item name is required.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Number.isInteger(minQuantity) ||
      minQuantity < 0
    ) {
      setError("Quantity and minimum quantity must be valid non-negative whole numbers.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name,
      category: form.category,
      quantity,
      min_quantity: minQuantity,
      unit: form.unit.trim() || "piece",
      location: form.location.trim() || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      let result;

      if (editingItem) {
        result = await supabase
          .from(tableName)
          .update(payload)
          .eq("id", editingItem.id)
          .select("*")
          .single();
      } else {
        result = await supabase
          .from(tableName)
          .insert([payload])
          .select("*")
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error("The inventory item was saved, but no data was returned.");
      }

      setItems((previous) => {
        if (editingItem) {
          return previous.map((item) =>
            String(item.id) === String(editingItem.id)
              ? result.data
              : item,
          );
        }

        return [result.data, ...previous];
      });

      setShowModal(false);
      setEditingItem(null);
      setForm(makeInitialForm(categories));

      onDataChanged?.();
    } catch (err) {
      console.error(`Error saving ${tableName}:`, err);
      setError(err?.message || "Failed to save the inventory item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (deletingId !== null) return;

    const confirmed = window.confirm(
      `Delete "${item.name}" from ${title}?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", item.id);

      if (deleteError) {
        throw deleteError;
      }

      setItems((previous) =>
        previous.filter(
          (current) =>
            String(current.id) !== String(item.id),
        ),
      );

      onDataChanged?.();
    } catch (err) {
      console.error(`Error deleting from ${tableName}:`, err);
      setError(err?.message || "Failed to delete the inventory item.");
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (date) => {
    if (!date) return false;

    return (
      String(date).slice(0, 10) <
      new Date().toISOString().slice(0, 10)
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Changes made here are stored in the shared{" "}
        <code className="font-bold">{tableName}</code> table.
        Administrators and other authorized staff will see the same
        updated inventory.
      </div>

      {error && !showModal && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Icon className="h-5 w-5 text-indigo-600" />
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Boxes className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 font-semibold text-slate-600">
            No {title.toLowerCase()} items found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => {
            const quantity = Number(item.quantity ?? 0);
            const minimum = Number(item.min_quantity ?? 0);
            const lowStock = quantity <= minimum;
            const expired = isExpired(item.expiry_date);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                  lowStock || expired
                    ? "border-red-300"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-800">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {item.category}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg p-2 ${
                      lowStock
                        ? "bg-red-100 text-red-600"
                        : "bg-emerald-100 text-emerald-600"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <p
                      className={`text-3xl font-black ${
                        lowStock ? "text-red-600" : "text-slate-800"
                      }`}
                    >
                      {quantity}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.unit || "piece"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      Minimum: {minimum}
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                        lowStock
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {lowStock ? "Low Stock" : "Sufficient"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  {item.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {item.location}
                      </span>
                    </p>
                  )}

                  {item.expiry_date && (
                    <p
                      className={`flex items-center gap-2 ${
                        expired ? "font-bold text-red-600" : ""
                      }`}
                    >
                      <CalendarClock className="h-4 w-4 shrink-0" />
                      Expires: {String(item.expiry_date).slice(0, 10)}
                    </p>
                  )}

                  {item.notes && (
                    <p
                      className={`text-xs ${
                        expired ? "text-red-600" : "text-slate-400"
                      }`}
                    >
                      {item.notes}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      disabled={deletingId !== null}
                      className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId !== null}
                      className="ml-auto flex items-center gap-1 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3
                id="inventory-modal-title"
                className="text-xl font-bold text-slate-800"
              >
                {editingItem ? "Edit Item" : "Add New Item"}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="inventory-name"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Item Name *
                </label>

                <input
                  id="inventory-name"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inventory-category"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    Category *
                  </label>

                  <select
                    id="inventory-category"
                    name="category"
                    required
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inventory-unit"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    Unit
                  </label>

                  <select
                    id="inventory-unit"
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[
                      "piece",
                      "box",
                      "set",
                      "pack",
                      "unit",
                      "roll",
                      "bottle",
                    ].map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inventory-quantity"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    Quantity *
                  </label>

                  <input
                    id="inventory-quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inventory-minimum"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    Minimum Quantity *
                  </label>

                  <input
                    id="inventory-minimum"
                    name="min_quantity"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.min_quantity}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="inventory-location"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Storage Location
                </label>

                <input
                  id="inventory-location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Cabinet A1, Shelf 3"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="inventory-expiry"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Expiry Date
                </label>

                <input
                  id="inventory-expiry"
                  name="expiry_date"
                  type="date"
                  value={form.expiry_date}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="inventory-notes"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Notes
                </label>

                <textarea
                  id="inventory-notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingItem
                      ? "Update Item"
                      : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
