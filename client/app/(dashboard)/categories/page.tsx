"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  Shield,
  Layers,
} from "lucide-react";
import { useCategories } from "@/hooks/use-categories";
import { Category, CreateCategoryData, UpdateCategoryData } from "@/lib/api";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

type FilterTab = "all" | "income" | "needs" | "wants" | "savings" | "transfer";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
  { key: "savings", label: "Savings" },
  { key: "transfer", label: "Transfer" },
];

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  income: { bg: "bg-green-500/10", text: "text-green-400" },
  needs: { bg: "bg-rose-500/10", text: "text-rose-400" },
  wants: { bg: "bg-amber-500/10", text: "text-amber-400" },
  savings: { bg: "bg-blue-500/10", text: "text-blue-400" },
  transfer: { bg: "bg-violet-500/10", text: "text-violet-400" },
};

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateCategoryData>({
    name: "",
    category_type: "needs",
    icon: "tag",
    color: "#22c55e",
  });

  const [editData, setEditData] = useState<UpdateCategoryData>({});

  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error;
      toast.error(error);
    }
  }, [error]);

  const activeCategories = categories.filter((c) => c.is_active !== false);

  const counts = activeCategories.reduce<Record<string, number>>((acc, c) => {
    acc.all = (acc.all || 0) + 1;
    acc[c.category_type] = (acc[c.category_type] || 0) + 1;
    return acc;
  }, {});

  const filtered = activeCategories.filter((cat) => {
    const matchesSearch = cat.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === "all" || cat.category_type === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    try {
      await createCategory(formData);
      toast.success("Category created");
      setShowCreateModal(false);
      setFormData({ name: "", category_type: "needs", icon: "tag", color: "#22c55e" });
    } catch {
      toast.error("Failed to create category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editData.name?.trim()) return;
    setIsSaving(true);
    try {
      await updateCategory(id, editData);
      toast.success("Category updated");
      setEditingId(null);
      setEditData({});
    } catch {
      toast.error("Failed to update category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditData({
      name: cat.name,
      category_type: cat.category_type as UpdateCategoryData["category_type"],
      icon: cat.icon ?? undefined,
      color: cat.color ?? undefined,
    });
  };

  return (
    <div className="p-6 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-slate-400">
            Organise transactions by spending bucket.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                activeTab === key
                  ? "bg-green-500 text-[#020617]"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {label}
              {counts[key] !== undefined && (
                <span
                  className={`ml-1.5 text-xs ${
                    activeTab === key ? "text-[#020617]/60" : "text-slate-600"
                  }`}
                >
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-sm text-slate-400">No categories found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors"
              >
                {editingId === category.id ? (
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      type="text"
                      value={editData.name || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleEdit(category.id)
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEdit(category.id)}
                      disabled={isSaving}
                      className="rounded-lg p-1.5 text-green-400 hover:bg-green-500/10 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditData({});
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Color swatch */}
                    <div
                      className="h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${category.color || "#22c55e"}1a`,
                      }}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color || "#22c55e" }}
                      />
                    </div>

                    {/* Name + badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {category.name}
                        </span>

                        {/* Type badge */}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ${
                            TYPE_STYLES[category.category_type]?.bg ??
                            "bg-slate-500/10"
                          } ${
                            TYPE_STYLES[category.category_type]?.text ??
                            "text-slate-400"
                          }`}
                        >
                          {category.category_type}
                        </span>

                        {/* System badge */}
                        {category.is_system && (
                          <span className="flex items-center gap-1 rounded-md bg-slate-500/10 px-1.5 py-0.5 text-xs text-slate-500">
                            <Shield className="h-3 w-3" />
                            system
                          </span>
                        )}

                        {/* Misc bucket badge */}
                        {category.is_misc_category && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">
                            <Layers className="h-3 w-3" />
                            misc
                          </span>
                        )}
                      </div>

                      {category.description && (
                        <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Actions — user categories only */}
                    {!category.is_system && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEditing(category)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                New Category
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Dining Out"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Type
                </label>
                <select
                  value={formData.category_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_type:
                        e.target.value as CreateCategoryData["category_type"],
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2.5 px-4 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="income">Income</option>
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                  <option value="savings">Savings</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Transfer categories are managed automatically.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Colour
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-7 w-7 rounded-lg transition-transform cursor-pointer ${
                        formData.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f172a] scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !formData.name.trim()}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-xl">
            <h3 className="text-base font-semibold text-white">
              Delete Category
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              This will permanently remove the category. Transactions using it
              will become uncategorised.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
