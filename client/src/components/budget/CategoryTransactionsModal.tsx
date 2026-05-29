"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { api, Transaction, TransactionParams } from "@/lib/api";
import { formatINR } from "@/lib/utils";

interface CategoryTransactionsModalProps {
  isOpen: boolean;
  categoryName: string;
  categoryType: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

type SortColumn = "date" | "description" | "amount" | null;
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 20;

export function CategoryTransactionsModal({
  isOpen,
  categoryName,
  categoryType,
  categoryId,
  startDate,
  endDate,
  onClose,
}: CategoryTransactionsModalProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const handleViewInTransactions = useCallback((tx: Transaction) => {
    const params = new URLSearchParams();
    if (tx.category_id) params.append("category", tx.category_id);
    if (tx.category_type) params.append("categoryType", tx.category_type);
    params.append("focusTx", tx.id);
    params.append("from", "report-modal");
    router.push(`/transactions?${params.toString()}`);
    onClose();
  }, [router, onClose]);

  const fetchTransactions = useCallback(async (page: number, sortCol: SortColumn, sortDir: SortDirection) => {
    setIsLoading(true);
    setError(null);
    try {
      // categoryId may be a composite key "type:name" (from history analysis) or a real UUID
      const isCompositeKey = categoryId.includes(":");

      if (!isCompositeKey) {
        // Real UUID — server-side pagination works correctly
        const params: TransactionParams = {
          category_id: categoryId,
          start_date: startDate,
          end_date: endDate,
          page,
          page_size: PAGE_SIZE,
          ...(sortCol === "date" || sortCol === "amount"
            ? { sort_by: sortCol, sort_order: sortDir }
            : { sort_by: "date" as const, sort_order: "desc" as const }),
        };
        const response = await api.getTransactions(params);
        setTransactions(response.transactions || []);
        setTotalPages(response.total_pages || 1);
        setTotalCount(response.total || 0);
      } else {
        // Composite key: must fetch ALL pages of this category type, then filter by name
        const colonIdx = categoryId.indexOf(":");
        const extractedType = categoryId.slice(0, colonIdx);

        // First request to find out total pages
        const firstResponse = await api.getTransactions({
          category_type: extractedType,
          start_date: startDate,
          end_date: endDate,
          page: 1,
          page_size: 100,
          sort_by: "date",
          sort_order: "desc",
        });

        let allTx = firstResponse.transactions || [];
        const serverTotalPages = firstResponse.total_pages || 1;

        // Fetch remaining pages in parallel
        if (serverTotalPages > 1) {
          const remainingPages = Array.from({ length: serverTotalPages - 1 }, (_, i) => i + 2);
          const rest = await Promise.all(
            remainingPages.map((p) =>
              api.getTransactions({
                category_type: extractedType,
                start_date: startDate,
                end_date: endDate,
                page: p,
                page_size: 100,
                sort_by: "date",
                sort_order: "desc",
              })
            )
          );
          for (const r of rest) {
            allTx = allTx.concat(r.transactions || []);
          }
        }

        // Filter by exact category name
        const filtered = allTx.filter(
          (tx) => tx.category_name?.toLowerCase() === categoryName.toLowerCase()
        );

        // Client-side sort
        if (sortCol === "date") {
          filtered.sort((a, b) => {
            const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
            return sortDir === "asc" ? diff : -diff;
          });
        } else if (sortCol === "amount") {
          filtered.sort((a, b) =>
            sortDir === "asc" ? a.amount - b.amount : b.amount - a.amount
          );
        } else if (sortCol === "description") {
          filtered.sort((a, b) => {
            const cmp = (a.description || "").localeCompare(b.description || "");
            return sortDir === "asc" ? cmp : -cmp;
          });
        }

        // Client-side paginate
        const totalFiltered = filtered.length;
        const clientTotalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
        const safePage = Math.min(page, clientTotalPages);
        const start = (safePage - 1) * PAGE_SIZE;
        const pageSlice = filtered.slice(start, start + PAGE_SIZE);

        setTransactions(pageSlice);
        setTotalPages(clientTotalPages);
        setTotalCount(totalFiltered);
        setCurrentPage(safePage);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch transactions";
      setError(message);
      setTransactions([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, categoryName, startDate, endDate]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      fetchTransactions(1, sortColumn, sortDirection);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (column: SortColumn) => {
    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";
    const newPage = 1; // Reset to first page on sort change
    setSortColumn(column);
    setSortDirection(newDirection);
    setCurrentPage(newPage);
    fetchTransactions(newPage, column, newDirection);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page, sortColumn, sortDirection);
  };

  // For UUID-based fetches, server handles sort. For composite keys, sort is done inside fetchTransactions.
  const sortedTransactions = transactions;

  const groupTransactionsByDate = (txs: Transaction[]) => {
    return txs.reduce((groups, tx) => {
      const date = new Date(tx.date).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
      return groups;
    }, {} as Record<string, Transaction[]>);
  };

  const groupedTransactions = groupTransactionsByDate(sortedTransactions);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (column !== sortColumn) return <span className="text-slate-500 ml-1">⇅</span>;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" />
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {categoryName} Transactions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatDate(startDate)} to {formatDate(endDate)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Category Type: {categoryType}
              {totalCount > 0 && (
                <span className="ml-2 text-slate-400">· {totalCount} transactions</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Transactions Table */}
        {!isLoading && sortedTransactions.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1220]/70">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-white/10 transition"
                    onClick={() => handleSort("description")}
                  >
                    Description <SortIcon column="description" />
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
                    onClick={() => handleSort("amount")}
                  >
                    Amount <SortIcon column="amount" />
                  </th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedTransactions).map(([date, txList]) => (
                  <React.Fragment key={date}>
                    <tr className="bg-slate-800">
                      <td colSpan={3} className="px-4 py-2 text-left text-slate-400 font-medium">
                        {date}
                      </td>
                    </tr>
                    {txList.map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-t border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-4 py-3 text-slate-200">
                          <p className="text-sm">{tx.description}</p>
                          {tx.bank_account_name && (
                            <p className="text-xs text-slate-500">{tx.bank_account_name}</p>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                          {tx.type === "income" ? "+" : "−"}{formatINR(Math.abs(tx.amount), 2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewInTransactions(tx)}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-600/50 bg-emerald-900/20 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-900/35 transition"
                          >
                            <ArrowRight className="h-3 w-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedTransactions.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-8 text-center text-slate-400">
            <p className="text-sm">
              No transactions found for {categoryName} during this period.
            </p>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages} · {totalCount} total
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page number buttons */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`min-w-[2rem] rounded-md px-2 py-1 text-xs transition ${
                      page === currentPage
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
