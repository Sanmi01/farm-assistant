interface Step3Props {
  landSizeValue: number | null;
  landSizeUnit: "acres" | "hectares";
  budgetAmount: number | null;
  onChange: (fields: {
    landSizeValue?: number | null;
    landSizeUnit?: "acres" | "hectares";
    budgetAmount?: number | null;
  }) => void;
  error?: string;
}

export function Step3Details({
  landSizeValue,
  landSizeUnit,
  budgetAmount,
  onChange,
  error,
}: Step3Props) {
  const parsePositive = (s: string): number | null => {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">
        Tell us about the farm.
      </h3>
      <p className="text-gray-500 mb-6">
        Size and budget help shape the recommendations you get.
      </p>

      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">Land size</label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={landSizeValue ?? ""}
            onChange={(e) =>
              onChange({ landSizeValue: parsePositive(e.target.value) })
            }
            placeholder="5"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
          />
          <select
            value={landSizeUnit}
            onChange={(e) =>
              onChange({
                landSizeUnit: e.target.value as "acres" | "hectares",
              })
            }
            className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
          >
            <option value="acres">acres</option>
            <option value="hectares">hectares</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Budget (USD)</label>
        <input
          type="number"
          step="100"
          min="1"
          value={budgetAmount ?? ""}
          onChange={(e) =>
            onChange({ budgetAmount: parsePositive(e.target.value) })
          }
          placeholder="10000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
    </div>
  );
}