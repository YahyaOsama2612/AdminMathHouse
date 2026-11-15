import { useEffect } from "react";

/** Delete confirmation in the MathPortal admin design. Props unchanged. */
const ConfirmDeleteModal = ({ open, onClose, onConfirm, title, description }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="a-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title || "Delete this item?"}</h2>
        <p className="text-sm text-gray-600 mb-5">{description || "Are you sure you want to delete this item? This can’t be undone."}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
