import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  DollarSign,
  Calendar,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Tag } from "@/components/Tag";
import { IconButton } from "@/components/IconButton";
import type { Farm } from "@/lib/types";

interface FarmCardProps {
  farm: Farm;
  onDelete: (farmId: string) => void;
}

export function FarmCard({ farm, onDelete }: FarmCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure you want to delete this farm? This action cannot be undone.",
      )
    ) {
      onDelete(farm.id);
    }
  };

  const displayLocation = farm.location.geo_address
    ? farm.location.geo_address
    : farm.location.address
      ? farm.location.address
      : `${farm.location.latitude.toFixed(4)}, ${farm.location.longitude.toFixed(4)}`;

  const weatherStatus = farm.weather_analysis?.status ?? "pending";
  const recsStatus = farm.recommendations?.status ?? "pending";

  const isWeatherComplete = weatherStatus === "completed";
  const isRecsComplete = recsStatus === "completed";
  const isBothComplete = isWeatherComplete && isRecsComplete;
  const isProcessing =
    weatherStatus === "processing" || recsStatus === "processing";
  const hasFailed =
    weatherStatus === "failed" || recsStatus === "failed";

  const suggestedCrops =
    isRecsComplete && farm.recommendations?.suggested_crops
      ? farm.recommendations.suggested_crops
      : [];

  return (
    <Card className="!p-0 overflow-hidden hover:border-emerald-200 hover:shadow-xl transition-all duration-300 group">
      <div className="bg-gradient-to-br from-emerald-400 to-blue-500 h-32 relative">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 left-4 text-white">
          <h3 className="text-xl font-semibold leading-tight">{farm.name}</h3>
          <p className="text-sm text-emerald-100 mt-1">
            {farm.land_size.value} {farm.land_size.unit}
          </p>
        </div>
        <div className="absolute bottom-4 right-4">
          {isBothComplete ? (
            <StatusBadge status="success" className="text-xs">
              ✓ Analyzed
            </StatusBadge>
          ) : hasFailed ? (
            <StatusBadge status="error" className="text-xs">
              ⚠ Failed
            </StatusBadge>
          ) : isProcessing ? (
            <StatusBadge status="info" className="text-xs">
              ⏳ Analyzing
            </StatusBadge>
          ) : (
            <StatusBadge status="pending" className="text-xs">
              ⏳ Pending
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col">
        <div className="space-y-3 mb-4">
          <div className="flex items-start text-gray-600">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <p className="text-sm line-clamp-2 min-h-[2.5rem]">
              {displayLocation}
            </p>
          </div>
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <p className="text-sm">
              {farm.budget.amount.toLocaleString()} {farm.budget.currency}{" "}
              budget
            </p>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <p className="text-sm">
              Created {new Date(farm.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {suggestedCrops.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              Recommended crops
            </p>
            <div className="flex flex-wrap gap-1">
              {suggestedCrops.slice(0, 3).map((crop) => (
                <Tag key={crop} variant="emerald" className="text-xs">
                  {crop}
                </Tag>
              ))}
              {suggestedCrops.length > 3 && (
                <span className="text-xs text-emerald-600 px-2 py-1">
                  +{suggestedCrops.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-2 mt-auto">
          <Link href={`/farms/${farm.id}`} className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              View details
            </Button>
          </Link>
          <IconButton
            icon={Trash2}
            onClick={handleDelete}
            variant="outline"
            ariaLabel="Delete farm"
            className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          />
        </div>
      </div>
    </Card>
  );
}