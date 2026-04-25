import * as React from "react";
import {
  CheckCircle2,
  MapPin,
  DollarSign,
  Maximize2,
} from "lucide-react";
import { InfoCard } from "@/components/InfoCard";
import type { CreateFarmRequest } from "@/lib/types";

interface Step4Props {
  data: CreateFarmRequest;
}

export function Step4Summary({ data }: Step4Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Review your farm.
        </h2>
        <p className="text-base text-gray-600">
          Make sure this is right before we create the farm.
        </p>
      </div>

      <SummaryCard
        icon={CheckCircle2}
        iconBg="bg-emerald-100"
        iconColor="text-emerald-600"
        label="Farm name"
        value={data.name}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <MapPin className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">Location</p>
            <p className="text-base font-medium text-gray-900">
              {data.location.latitude.toFixed(4)},{" "}
              {data.location.longitude.toFixed(4)}
            </p>
            {data.location.address && (
              <p className="text-sm text-gray-500 mt-2">
                {data.location.address}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SummaryCard
          icon={Maximize2}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Land size"
          value={`${data.land_size.value} ${data.land_size.unit}`}
        />
        <SummaryCard
          icon={DollarSign}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Budget"
          value={`${data.budget.amount.toLocaleString()} ${data.budget.currency}`}
        />
      </div>

      <InfoCard
        icon={CheckCircle2}
        title="What happens next?"
        description="After you create the farm, we'll fetch a 16-day weather forecast and generate AI-powered recommendations in the background. Both usually finish in 10-20 seconds."
        variant="emerald"
      />
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

function SummaryCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: SummaryCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-start space-x-4">
        <div className={`${iconBg} p-3 rounded-xl`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}