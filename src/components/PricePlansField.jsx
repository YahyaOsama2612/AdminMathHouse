import React from "react";

const PricePlansField = ({ value = [], onChange }) => {
  const addPlan = () => {
    onChange([
      ...value,
      {
        label: "",
        days: "",
        priceEgp: "",
        priceUsd: "",
        hasDiscount: false,
        discountEgp: "",
        discountUsd: "",
      },
    ]);
  };

  const updatePlan = (index, key, val) => {
    const updated = [...value];
    updated[index][key] = val;
    onChange(updated);
  };

  const removePlan = (index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-5">
      {value.map((plan, index) => (
        <div
          key={index}
          className="border rounded-2xl p-5 bg-white shadow-sm space-y-4"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">
              Plan {index + 1}
            </h3>

            <button
              type="button"
              onClick={() => removePlan(index)}
              className="text-red-500 text-sm hover:underline"
            >
              Remove
            </button>
          </div>

          {/* Plan Name */}
          <div>
            <label className="text-sm text-gray-500">Plan Name</label>
            <input
              value={plan.label}
              onChange={(e) =>
                updatePlan(index, "label", e.target.value)
              }
              className="w-full mt-1 p-2 border rounded-lg"
              placeholder="e.g. Monthly / 3 Months"
            />
          </div>

          {/* Days */}
          <div>
            <label className="text-sm text-gray-500">Days</label>
            <input
              type="number"
              min="1"
              value={plan.days}
              onChange={(e) =>
                updatePlan(index, "days", e.target.value)
              }
              className="w-full mt-1 p-2 border rounded-lg"
              placeholder="e.g. 30"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">
                Price (EGP)
              </label>
              <input
                type="number"
                min="0"
                value={plan.priceEgp}
                onChange={(e) =>
                  updatePlan(index, "priceEgp", e.target.value)
                }
                className="w-full mt-1 p-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">
                Price (USD)
              </label>
              <input
                type="number"
                              min="0"

                value={plan.priceUsd}
                onChange={(e) =>
                  updatePlan(index, "priceUsd", e.target.value)
                }
                className="w-full mt-1 p-2 border rounded-lg"
              />
            </div>
          </div>

          {/* Discount Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={plan.hasDiscount}
              onChange={(e) =>
                updatePlan(index, "hasDiscount", e.target.checked)
              }
            />
            <label className="text-sm">Has Discount</label>
          </div>

          {/* Discount Fields */}
          {plan.hasDiscount && (
            <div className="grid grid-cols-2 gap-4 bg-green-50 p-3 rounded-lg border border-green-200">
              <div>
                <label className="text-sm text-gray-600">
                  Discount (EGP)
                </label>
                <input
                  type="number"
                  min="0"
                  value={plan.discountEgp}
                  onChange={(e) =>
                    updatePlan(index, "discountEgp", e.target.value)
                  }
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Discount (USD)
                </label>
                <input
                                  min="0"

                  type="number"
                  value={plan.discountUsd}
                  onChange={(e) =>
                    updatePlan(index, "discountUsd", e.target.value)
                  }
                  className="w-full mt-1 p-2 border rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Button */}
      <button
        type="button"
        onClick={addPlan}
className="bg-gradient-to-r from-one  to-one/80 
text-white py-2 rounded-lg 
shadow-lg shadow-one/50
hover:shadow-one/80 
hover:scale-[1.02] 
transition duration-300"      >
        + Add Plan
      </button>
    </div>
  );
};

export default PricePlansField;