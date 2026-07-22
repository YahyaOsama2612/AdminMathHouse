import React from "react";
import { X } from "lucide-react";
import Loader from "@/components/Loader";

const Chip = ({ children }) => (
  <span className="px-2.5 py-1 text-xs font-medium bg-one/10 text-one rounded-full">
    {children}
  </span>
);

const ChipList = ({ items, empty = "None" }) => {
  if (!items || items.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic">{empty}</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Chip key={item.id || i}>{item}</Chip>
      ))}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const PromoCodeDetailsModal = ({ open, onClose, promo, loading, error }) => {
  if (!open) return null;

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">
            {promo?.promoName || "Promo Code Details"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="py-12">
              <Loader />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 font-medium text-center py-8">
              {error}
            </p>
          ) : promo ? (
            <div className="space-y-6">
              {/* General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Promo Code">{promo.code}</Field>
                <Field label="Type">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      promo.type === "restricted"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {promo.type === "restricted" ? "Restricted" : "Generic"}
                  </span>
                </Field>
                <Field label="Discount">{promo.discountAmount}%</Field>
                <Field label="Usages">
                  {promo.numberOfUsers ?? 0} / {promo.numberOfUsagesAllowed}{" "}
                  used
                </Field>
                <Field label="Start Date">{fmtDate(promo.startDate)}</Field>
                <Field label="End Date">{fmtDate(promo.endDate)}</Field>
              </div>

              {/* Scope */}
              <div className="space-y-4 pt-2 border-t border-border">
                <Field label="Courses">
                  <ChipList items={promo.courses?.map((c) => c.courseName)} />
                </Field>
                <Field label="Packages">
                  <ChipList items={promo.packages?.map((p) => p.packageName)} />
                </Field>
                <Field label="Currencies">
                  <ChipList
                    items={promo.currencies?.map((c) =>
                      c.code ? `${c.name} (${c.code})` : c.name,
                    )}
                  />
                </Field>
                <Field label="Chapters">
                  <ChipList
                    items={promo.chapters?.map((c) => c.chapterName || c.name)}
                  />
                </Field>
                <Field label="Lessons">
                  <ChipList
                    items={promo.lessons?.map((l) => l.lessonName || l.name)}
                  />
                </Field>
              </div>

              {/* Restricted students */}
              {promo.type === "restricted" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Field label="Allowed Students">
                    <ChipList
                      items={promo.allowedStudents?.map(
                        (s) => s.label || `${s.firstname} ${s.lastname}` || s.email || s.id,
                      )}
                      empty="No students assigned"
                    />
                  </Field>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PromoCodeDetailsModal;
