import { useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { InfoCard } from "@/components/InfoCard";

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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation isn't available in this browser.",
      );
      return;
    }
    setIsGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
        setIsGettingLocation(false);
      },
      () => {
        setLocationError(
          "Couldn't get your location. Enter coordinates manually.",
        );
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const parse = (s: string): number | null => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? Number(n.toFixed(4)) : null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Where is your farm?
        </h2>
        <p className="text-base text-gray-600">
          Latitude and longitude let us pull local weather for this farm.
        </p>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          onClick={useCurrentLocation}
          disabled={isGettingLocation}
          variant="outline"
          className="flex items-center space-x-2"
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting location...</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              <span>Use my current location</span>
            </>
          )}
        </Button>
      </div>

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-sm text-red-600">{locationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Latitude"
          name="latitude"
          type="number"
          step="0.0001"
          min={-90}
          max={90}
          placeholder="e.g. 7.3775"
          value={latitude ?? ""}
          onChange={(e) =>
            onChange({ latitude: parse(e.target.value) })
          }
          required
        />
        <FormField
          label="Longitude"
          name="longitude"
          type="number"
          step="0.0001"
          min={-180}
          max={180}
          placeholder="e.g. 3.9470"
          value={longitude ?? ""}
          onChange={(e) =>
            onChange({ longitude: parse(e.target.value) })
          }
          required
        />
      </div>

      <FormField
        label="Address (optional)"
        name="address"
        type="text"
        placeholder="Ibadan, Oyo, Nigeria"
        value={address}
        onChange={(e) => onChange({ address: e.target.value })}
      />

      <InfoCard
        icon={MapPin}
        title="Need help finding your coordinates?"
        description="Use the button above, or right-click your farm location in Google Maps and select 'What's here?' to copy the latitude and longitude."
        variant="blue"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}