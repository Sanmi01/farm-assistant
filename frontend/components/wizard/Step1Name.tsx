interface Step1Props {
  name: string;
  onChange: (name: string) => void;
  error?: string;
}

export function Step1Name({ name, onChange, error }: Step1Props) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">
        What do you want to call this farm?
      </h3>
      <p className="text-gray-500 mb-6">
        A short name that helps you tell your farms apart.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Alabi Farms"
        maxLength={100}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      />
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}