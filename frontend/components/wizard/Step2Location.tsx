interface Step2Props {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onChange: (fields: {
    latitude?: number | null;
    longitude?: number | null;
    address?: string;
  }) => void;
  error?: string;
}

export function Step2Location({
  latitude,
  longitude,
  address,
  onChange,
  error,
}: Step2Props) {
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
      },
      () => {
        alert("Couldn't get your location. Enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const parse = (s: string): number | null => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Number(n.toFixed(4)) : null;
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">
        Where is your farm?
      </h3>
      <p className="text-gray-500 mb-6">
        Latitude and longitude let us pull local weather for this farm.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={latitude ?? ""}
            onChange={(e) => onChange({ latitude: parse(e.target.value) })}
            placeholder="7.3775"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={longitude ?? ""}
            onChange={(e) => onChange({ longitude: parse(e.target.value) })}
            placeholder="3.9470"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={useCurrentLocation}
        className="text-sm text-emerald-700 underline mb-6"
      >
        Use my current location
      </button>

      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Address (optional)
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Ibadan, Oyo, Nigeria"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
        />
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
    </div>
  );
}