import React, { useState, useMemo, useRef, useEffect } from "react";
import { Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight, ChevronDown, X, RotateCcw, HardDrive } from "lucide-react";
import TruncatedText from "./TruncatedText";

/* MathPortal admin design: page header, one filter bar (search + column filters + count),
   white table card with small uppercase headers, icon actions and a compact pager.
   Props and behaviour are unchanged — ~36 list pages use this component. */

// --- Searchable select used by `filterType: "select"` columns ---
export const SearchableSelect = ({ value, onChange, options = [], placeholder = "All" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, searchQuery]);

  return (
    <div className={`relative w-full ${isOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center border rounded-xl px-3 py-2 text-sm bg-white cursor-pointer transition-colors ${
          value ? "border-one text-one font-semibold bg-red-50/40" : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <span className="truncate pr-1">{value || placeholder}</span>
        <span className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); onChange(""); setSearchQuery(""); }}
              className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
          <div className="p-2 border-b border-gray-100 bg-gray-50/60">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search options..."
                className="w-full py-1.5 pl-7 pr-2 text-xs border border-gray-200 rounded-lg bg-white outline-none focus:border-one"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <ul className="py-1 overflow-y-auto max-h-56 custom-scrollbar">
            <li
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-red-50 transition-colors ${!value ? "text-one font-bold" : "text-gray-700"}`}
              onClick={() => { onChange(""); setIsOpen(false); setSearchQuery(""); }}
            >
              All
            </li>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((val, idx) => (
                <li
                  key={idx}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-red-50 transition-colors ${value === val ? "text-one font-bold bg-red-50/60" : "text-gray-700"}`}
                  onClick={() => { onChange(val); setIsOpen(false); setSearchQuery(""); }}
                >
                  {val}
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-xs text-center text-gray-400">No results found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Status toggle / pill, edit and delete buttons for a row. */
export const RowActions = ({ row, onEdit, onDelete, extraActions, showStatusInActions, onToggleStatus, statusKey }) => (
  <div className="flex items-center justify-end gap-1.5 flex-wrap">
    {showStatusInActions && (onToggleStatus ? (
      <button
        onClick={() => onToggleStatus(row)}
        className={`a-switch ${row[statusKey] === "active" ? "on" : ""}`}
        title={row[statusKey] === "active" ? "Active — click to deactivate" : "Inactive — click to activate"}
        aria-label="Toggle status"
      >
        <span></span>
      </button>
    ) : (
      <span className={`a-pill ${row[statusKey] === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {row[statusKey] === "active" ? "● Active" : row[statusKey]}
      </span>
    ))}
    {extraActions && <div className="flex items-center gap-1.5">{extraActions(row)}</div>}
    {onEdit && (
      <button onClick={() => onEdit(row)} className="a-act" title="Edit" aria-label="Edit">
        <Pencil className="w-4 h-4" />
      </button>
    )}
    {onDelete && (
      <button onClick={() => onDelete(row)} className="a-act del" title="Delete" aria-label="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </div>
);

/** Page title row: title (+ anything passed as children) on the left, buttons on the right. */
export const TableHeader = ({ title, children, titleAdd, onAddClick, extraButton, onGoToDrive }) => (
  <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
    <div className="min-w-0 flex flex-wrap items-center gap-3">
      {title && <h1 className="font-bold text-xl text-gray-800">{title}</h1>}
      {children && <div className="min-w-0">{children}</div>}
    </div>
    <div className="flex flex-wrap gap-2">
      {extraButton && (
        <button type="button" onClick={onGoToDrive} className="a-btn"><HardDrive size={16} /> Go to Drive</button>
      )}
      {titleAdd && (
        <button onClick={onAddClick} className="a-btn primary"><Plus className="w-4 h-4" /> Add {titleAdd}</button>
      )}
    </div>
  </div>
);

export const Pager = ({ currentPage, totalPages, setPage, shown, total, label = "results" }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
    <span>Showing <b className="text-gray-800">{shown}</b> of <b className="text-gray-800">{total}</b> {label}</span>
    <div className="flex items-center gap-2">
      <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="a-act disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-xs font-semibold">
        Page{" "}
        <input
          type="number"
          min={1}
          max={totalPages || 1}
          value={currentPage}
          onChange={(e) => setPage(Math.max(1, Math.min(totalPages || 1, Number(e.target.value))))}
          className="w-12 text-center border border-gray-200 rounded-lg py-1 font-bold outline-none focus:border-one"
        />{" "}
        of {totalPages || 1}
      </span>
      <button disabled={currentPage >= totalPages || totalPages === 0} onClick={() => setPage(currentPage + 1)} className="a-act disabled:opacity-30" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
    </div>
  </div>
);

const ReusableTable = ({
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
  children,
  rowsPerPage = 10,
  extraButton = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };
  const clearAllFilters = () => { setColumnFilters({}); setSearchTerm(""); setCurrentPage(1); };

  const activeFiltersCount = useMemo(() => {
    const columnCount = Object.values(columnFilters).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
    return columnCount + (searchTerm.trim() ? 1 : 0);
  }, [columnFilters, searchTerm]);

  const getUniqueValues = (key) => {
    const values = [];
    data.forEach((item) => {
      const raw = item[key];
      if (raw == null || raw === "" || raw === "-") return;
      const str = String(raw).trim();
      if (!str || str === "-") return;
      if (str.includes(",")) {
        str.split(",").forEach((p) => { const t = p.trim(); if (t && t !== "-") values.push(t); });
      } else {
        values.push(str);
      }
    });
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  };

  // Opens the Drive login of this same app in a new tab
  const handleGoToDrive = () => window.open(`${window.location.origin}/logindrive`, "_blank", "noopener,noreferrer");

  const filteredData = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return data.filter((row) => {
      const matchesGlobalSearch = !term || columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(term));
      if (!matchesGlobalSearch) return false;
      return columns.every((col) => {
        if (!col.filterable) return true;
        const rawFilter = columnFilters[col.key];
        if (rawFilter == null || String(rawFilter).trim() === "") return true;
        const cellValue = String(row[col.key] ?? "").trim().toLowerCase();
        const filterValue = String(rawFilter).trim().toLowerCase();
        if (col.filterType === "select") {
          if (cellValue === filterValue) return true;
          if (cellValue.includes(",")) return cellValue.split(",").map((p) => p.trim()).includes(filterValue);
          return false;
        }
        return cellValue.includes(filterValue);
      });
    });
  }, [data, columns, searchTerm, columnFilters]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentRows = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const filterCols = columns.filter((col) => col.filterable);
  const hasActions = onEdit || onDelete || extraActions || showStatusInActions;

  return (
    <div className="w-full text-left">
      <TableHeader title={title} titleAdd={titleAdd} onAddClick={onAddClick} extraButton={extraButton} onGoToDrive={handleGoToDrive}>
        {children}
      </TableHeader>

      {/* Filter bar */}
      <div className="a-card p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center gap-2">
        <div className="relative sm:col-span-2 lg:flex-1 lg:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search…"
            className="w-full border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm bg-white outline-none focus:border-one focus:ring-2 focus:ring-one/10"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          {searchTerm && (
            <button type="button" onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" title="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {filterCols.map((col, index) => (
          <div key={col.key} className="relative lg:w-48" style={{ zIndex: col.filterType === "select" ? 30 - index : undefined }} title={col.header}>
            {col.filterType === "select" ? (
              <SearchableSelect
                value={columnFilters[col.key] || ""}
                onChange={(val) => handleColumnFilterChange(col.key, val)}
                options={getUniqueValues(col.key)}
                placeholder={`All ${String(col.header).toLowerCase()}`}
              />
            ) : (
              <input
                type="text"
                placeholder={col.header}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-one"
                value={columnFilters[col.key] || ""}
                onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="flex items-center gap-3 sm:col-span-2 lg:ml-auto">
          {activeFiltersCount > 0 && (
            <button type="button" onClick={clearAllFilters} className="text-xs font-bold text-gray-500 hover:text-one flex items-center gap-1" title="Reset all filters and search">
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <span className="text-xs text-gray-400">{filteredData.length} of {data.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="a-card overflow-visible">
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
              {currentRows.length > 0 ? (
                currentRows.map((row, rowIndex) => (
                  <tr key={row.id ?? rowIndex} className="a-tr">
                    <td className="a-td text-gray-400 text-xs font-semibold">{(currentPage - 1) * rowsPerPage + rowIndex + 1}</td>
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="a-td">
                        {col.render ? col.render(row[col.key], row) : <TruncatedText text={String(row[col.key] || "")} />}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="a-td">
                        <RowActions row={row} onEdit={onEdit} onDelete={onDelete} extraActions={extraActions} showStatusInActions={showStatusInActions} onToggleStatus={onToggleStatus} statusKey={statusKey} />
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="py-14 text-center">
                    <p className="font-bold text-gray-700">{data.length ? "Nothing matches" : "Nothing here yet"}</p>
                    <p className="text-sm text-gray-400">{data.length ? "Try another search or filter." : titleAdd ? `Use “Add ${titleAdd}” to create the first one.` : ""}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <Pager currentPage={currentPage} totalPages={totalPages} setPage={setCurrentPage} shown={currentRows.length} total={filteredData.length} />
        )}
      </div>
    </div>
  );
};

export default ReusableTable;
