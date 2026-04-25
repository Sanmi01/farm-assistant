import { FormField } from "@/components/FormField";

interface Step1Props {
  name: string;
  onChange: (name: string) => void;
  error?: string;
}

export function Step1Name({ name, onChange, error }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          What do you want to call this farm?
        </h2>
        <p className="text-base text-gray-600">
          A short name that helps you tell your farms apart.
        </p>
      </div>

      <FormField
        label="Farm name"
        name="name"
        type="text"
        placeholder="e.g. Alabi Farms"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        required
        maxLength={100}
        inputClassName="text-lg"
      />
    </div>
  );
}