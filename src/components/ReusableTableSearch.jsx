import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import TruncatedText from "./TruncatedText";
import { RowActions, TableHeader } from "./ReusableTable";

/* Server-paginated table in the MathPortal admin design. Props and behaviour are unchanged. */
const ReusableTableSearch = ({
  title,
  columns,
  data = [],
  onAddClick,
  titleAdd,
  onEdit,
  onDelete,
  extraActions,
  showStatusInActions = false,
  onToggleStatus,
  statusKey = "status",
  loading = false,

  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
  rowsPerPage = 10,
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  children,
  // Search & filters
  searchTerm = "",
  onSearchChange = () => {},
  filters = [],
  filterValues = {},
  onFilterChange = () => {},
}) => {
  const hasActions = onEdit || onDelete || extraActions || showStatusInActions;

  return (
    <div className="w-full text-left">
      <TableHeader title={title} titleAdd={titleAdd} onAddClick={onAddClick}>{children}</TableHeader>

      {/* Filter bar */}
      <div className="a-card p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2">
        <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white outline-none focus:border-one focus:ring-2 focus:ring-one/10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {(filters || []).map((filter, index) => (
          <div key={filter.key || index} className="lg:w-48" title={filter.label}>
            {filter.type === "text" ? (
              <input
                type="text"
                value={filterValues[filter.key] || ""}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                placeholder={filter.label}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-one"
              />
            ) : (
              <select
                value={filterValues[filter.key] || ""}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-one cursor-pointer"
              >
                <option value="">All {String(filter.label || "").toLowerCase()}</option>
                {(filter.options || []).map((opt, i) => (
                  <option key={i} value={opt.value ?? opt}>{opt.label ?? opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
        <span className="text-xs text-gray-400 sm:col-span-2 lg:ml-auto">{totalResults} total</span>
      </div>

      {/* Table */}
      <div className={`a-card overflow-visible transition-opacity ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="a-th w-12">#</th>
                {columns.map((col, index) => <th key={index} className="a-th">{col.header}</th>)}
                {hasActions && <th className="a-th text-right" data-keep>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <tr key={row.id || rowIndex} className="a-tr">
                    <td className="a-td text-gray-400 text-xs font-semibold">{(currentPage - 1) * rowsPerPage + rowIndex + 1}</td>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="a-td">
                        {col.render ? col.render(row[col.key], row) : <TruncatedText text={String(row[col.key] || "")} />}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="a-td">
                        <RowActions
                          row={row}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          extraActions={extraActions}
                          showStatusInActions={showStatusInActions}
                          onToggleStatus={(r) => onToggleStatus?.(r)}
                          statusKey={statusKey}
                        />
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="py-14 text-center">
                    {loading ? (
                      <div className="space-y-2 px-6">{[1, 2, 3].map((i) => <div key={i} className="skel h-8"></div>)}</div>
                    ) : (
                      <>
                        <p className="font-bold text-gray-700">Nothing matches</p>
                        <p className="text-sm text-gray-400">Try another search or filter.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <span><b className="text-gray-800">{totalResults}</b> items</span>
            <select
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none focus:border-one cursor-pointer"
            >
              {[10, 20, 50, 100].map((size) => <option key={size} value={size}>Show {size}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)} className="a-act disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-semibold">
              Page{" "}
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && (totalPages ? val <= totalPages : true)) onPageChange?.(val);
                }}
                className="w-12 text-center border border-gray-200 rounded-lg py-1 font-bold outline-none focus:border-one"
              />{" "}
              of {totalPages || 1}
            </span>
            <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => onPageChange?.(currentPage + 1)} className="a-act disabled:opacity-30" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReusableTableSearch;
