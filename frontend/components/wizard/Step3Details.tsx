import { DollarSign } from "lucide-react";
import { FormField } from "@/components/FormField";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Tell us about the farm.
        </h2>
        <p className="text-base text-gray-600">
          Size and budget help shape the recommendations you get.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormField
            label="Land size"
            name="landSize"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="5"
            value={landSizeValue ?? ""}
            onChange={(e) =>
              onChange({ landSizeValue: parsePositive(e.target.value) })
            }
            required
          />
          <div className="mt-3">
            <Label
              htmlFor="landSizeUnit"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Unit
            </Label>
            <select
              id="landSizeUnit"
              value={landSizeUnit}
              onChange={(e) =>
                onChange({
                  landSizeUnit: e.target.value as "acres" | "hectares",
                })
              }
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-gray-300 bg-white transition-all duration-200",
                "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none",
              )}
            >
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <FormField
            label="Budget (USD)"
            name="budget"
            type="number"
            step="100"
            min="1"
            placeholder="10000"
            value={budgetAmount ?? ""}
            onChange={(e) =>
              onChange({ budgetAmount: parsePositive(e.target.value) })
            }
            required
            inputClassName="pl-9"
          />
          <DollarSign className="absolute left-3 top-[42px] h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}