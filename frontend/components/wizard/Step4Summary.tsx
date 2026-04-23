import type { CreateFarmRequest } from "@/lib/types";

interface Step4Props {
  data: CreateFarmRequest;
}

export function Step4Summary({ data }: Step4Props) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">Review</h3>
      <p className="text-gray-500 mb-6">
        Make sure this is right before creating the farm.
      </p>

      <dl className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <Row label="Name" value={data.name} />
        <Row
          label="Location"
          value={`${data.location.latitude}, ${data.location.longitude}`}
        />
        {data.location.address && (
          <Row label="Address" value={data.location.address} />
        )}
        <Row
          label="Land size"
          value={`${data.land_size.value} ${data.land_size.unit}`}
        />
        <Row
          label="Budget"
          value={`${data.budget.amount.toLocaleString()} ${data.budget.currency}`}
        />
      </dl>

      <p className="text-sm text-gray-500 mt-4">
        After you create the farm, we'll fetch 16 days of weather and generate
        recommendations in the background. You'll see progress on the farms
        page.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{value}</dd>
    </div>
  );
}