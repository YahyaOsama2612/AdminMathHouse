import React from "react";

const PricePlansModal = ({ open, onClose, row }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold">Price Plans</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-auto space-y-5">

          {row?.prices?.length ? (
            row.prices.map((p) => (
              <div
                key={p.id}
                className="border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition"
              >
                {/* Top Row */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-lg">
                    {p.durationLabel || "Plan"}
                  </h3>

                  {p.isDefault && (
                    <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full">
                      Default
                    </span>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

                  <div>
                    <p className="text-gray-500">Days</p>
                    <p className="font-medium">{p.durationDays}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Price (EGP)</p>
                    <p className="font-medium">{p.priceEgp}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Price (USD)</p>
                    <p className="font-medium">{p.priceUsd}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Total (EGP)</p>
                    <p className="font-bold text-green-600">
                      {p.totalPriceEgp}
                    </p>
                  </div>

                </div>

                {/* Discount */}
                {p.hasDiscount && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="text-green-700 font-medium mb-1">
                      Discount
                    </p>
                    <p>
                      {p.discountEgp} EGP / {p.discountUsd} USD
                    </p>
                  </div>
                )}

              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-10">
              No price plans available
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="bg-one text-white px-5 py-2 rounded-lg hover:opacity-90 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default PricePlansModal;