"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  Tag,
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

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const groupedCategories = {
    income: filteredCategories.filter((cat) => cat.category_type === "income"),
    needs: filteredCategories.filter((cat) => cat.category_type === "needs"),
    wants: filteredCategories.filter((cat) => cat.category_type === "wants"),
    savings: filteredCategories.filter(
      (cat) => cat.category_type === "savings",
    ),
    transfer: filteredCategories.filter(
      (cat) => cat.category_type === "transfer",
    ),
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setIsSaving(true);
    try {
      await createCategory(formData);
      setShowCreateModal(false);
      setFormData({
        name: "",
        category_type: "needs",
        icon: "tag",
        color: "#22c55e",
      });
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editData.name?.trim()) return;
    setIsSaving(true);
    try {
      await updateCategory(id, editData);
      setEditingId(null);
      setEditData({});
    } catch (err) {
      console.error("Failed to update category:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditData({
      name: category.name,
      category_type: category.category_type,
      icon: category.icon ?? undefined,
      color: category.color ?? undefined,
    });
  };

  const categoryColors: Record<string, string> = {
    income: "bg-green-500/10",
    needs: "bg-red-500/10",
    wants: "bg-orange-500/10",
    savings: "bg-blue-500/10",
    transfer: "bg-purple-500/10",
  };

  const categoryTextColors: Record<string, string> = {
    income: "text-green-400",
    needs: "text-red-400",
    wants: "text-orange-400",
    savings: "text-blue-400",
    transfer: "text-purple-400",
  };

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-5 w-5 text-[#020617]" />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                Fintra
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Transactions
            </Link>
            <Link
              href="/budgets"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Budget
            </Link>
            <Link
              href="/categories"
              className="text-sm font-medium text-green-400"
            >
              Categories
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-slate-400">
              Manage your transaction categories.
            </p>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(groupedCategories).map(([type, cats]) => (
                <div
                  key={type}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
                >
                  <div
                    className={`border-b border-white/10 ${categoryColors[type as keyof typeof categoryColors]} px-6 py-4`}
                  >
                    <h2
                      className={`text-lg font-semibold capitalize ${categoryTextColors[type as keyof typeof categoryTextColors]}`}
                    >
                      {type} ({cats.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-white/5">
                    {cats.length === 0 ? (
                      <div className="px-6 py-8 text-center text-slate-400">
                        No {type} categories
                      </div>
                    ) : (
                      cats.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
                        >
                          {editingId === category.id ? (
                            <div className="flex-1 flex items-center gap-3">
                              <input
                                type="text"
                                value={editData.name || ""}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    name: e.target.value,
                                  })
                                }
                                className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleEdit(category.id)}
                                disabled={isSaving}
                                className="p-1.5 text-green-400 hover:text-green-300 disabled:opacity-50 cursor-pointer"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditData({});
                                }}
                                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                                  style={{
                                    backgroundColor: `${category.color || "#22c55e"}20`,
                                  }}
                                >
                                  <Tag
                                    className="h-4 w-4"
                                    style={{
                                      color: category.color || "#22c55e",
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {category.name}
                                  </p>
                                  {category.description && (
                                    <p className="text-xs text-slate-500">
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => startEditing(category)}
                                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirmId(category.id)
                                  }
                                  className="p-2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Create Category
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Category name"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                  Type
                </label>
                <select
                  value={formData.category_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_type: e.target.value as
                        | "income"
                        | "needs"
                        | "wants"
                        | "savings"
                        | "transfer",
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="income">Income</option>
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                  <option value="savings">Savings</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-8 w-8 rounded-lg transition-transform ${
                        formData.color === color
                          ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f172a] scale-110"
                          : ""
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
                  <Save className="h-4 w-4" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <h3 className="text-lg font-semibold text-white">
              Delete Category
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete this category? Transactions using
              this category will become uncategorized.
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
