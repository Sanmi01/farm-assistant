import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { Step1Name } from "@/components/wizard/Step1Name";
import { Step2Location } from "@/components/wizard/Step2Location";
import { Step3Details } from "@/components/wizard/Step3Details";
import { Step4Summary } from "@/components/wizard/Step4Summary";
import { useFormSteps } from "@/hooks/useFormSteps";
import { api } from "@/lib/api";
import type { CreateFarmRequest } from "@/lib/types";

const STEP_LABELS = ["Name", "Location", "Details", "Review"];

export default function NewFarmPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/");
  }, [isLoaded, isSignedIn, router]);

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [landSizeValue, setLandSizeValue] = useState<number | null>(null);
  const [landSizeUnit, setLandSizeUnit] = useState<"acres" | "hectares">(
    "acres",
  );
  const [budgetAmount, setBudgetAmount] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<number, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateStep = async (step: number): Promise<boolean> => {
    const next = { ...errors };
    let ok = true;

    if (step === 1) {
      if (!name.trim()) {
        next[1] = "A farm name is required.";
        ok = false;
      } else {
        next[1] = undefined;
      }
    }

    if (step === 2) {
      if (latitude === null || longitude === null) {
        next[2] = "Both latitude and longitude are required.";
        ok = false;
      } else if (
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        next[2] = "Coordinates are out of valid range.";
        ok = false;
      } else {
        next[2] = undefined;
      }
    }

    if (step === 3) {
      if (!landSizeValue || landSizeValue <= 0) {
        next[3] = "Land size must be a positive number.";
        ok = false;
      } else if (!budgetAmount || budgetAmount <= 0) {
        next[3] = "Budget must be a positive number.";
        ok = false;
      } else {
        next[3] = undefined;
      }
    }

    setErrors(next);
    return ok;
  };

  const { currentStep, goNext, goBack, isFirst, isLast } = useFormSteps({
    totalSteps: 4,
    validateStep,
  });

  const buildRequest = (): CreateFarmRequest => ({
    name: name.trim(),
    location: {
      latitude: latitude!,
      longitude: longitude!,
      address: address.trim() || null,
    },
    land_size: { value: landSizeValue!, unit: landSizeUnit },
    budget: { amount: budgetAmount!, currency: "USD" },
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.createFarm(() => getToken(), buildRequest());
      router.replace("/farms");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create farm.",
      );
      setSubmitting(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="mb-8">
          <Link href="/farms" className="text-sm text-gray-600 hover:underline">
            ← Back to farms
          </Link>
        </nav>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Register a farm
          </h1>
          <p className="text-gray-500 mb-6">
            Four quick steps. Each one has validation before you can move on.
          </p>

          <ProgressBar current={currentStep} total={4} labels={STEP_LABELS} />

          <div className="min-h-[260px] mb-8">
            {currentStep === 1 && (
              <Step1Name
                name={name}
                onChange={setName}
                error={errors[1]}
              />
            )}
            {currentStep === 2 && (
              <Step2Location
                latitude={latitude}
                longitude={longitude}
                address={address}
                onChange={(f) => {
                  if (f.latitude !== undefined) setLatitude(f.latitude);
                  if (f.longitude !== undefined) setLongitude(f.longitude);
                  if (f.address !== undefined) setAddress(f.address);
                }}
                error={errors[2]}
              />
            )}
            {currentStep === 3 && (
              <Step3Details
                landSizeValue={landSizeValue}
                landSizeUnit={landSizeUnit}
                budgetAmount={budgetAmount}
                onChange={(f) => {
                  if (f.landSizeValue !== undefined)
                    setLandSizeValue(f.landSizeValue);
                  if (f.landSizeUnit !== undefined)
                    setLandSizeUnit(f.landSizeUnit);
                  if (f.budgetAmount !== undefined)
                    setBudgetAmount(f.budgetAmount);
                }}
                error={errors[3]}
              />
            )}
            {currentStep === 4 && <Step4Summary data={buildRequest()} />}
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={goBack}
              disabled={isFirst || submitting}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-40"
            >
              Back
            </button>
            {!isLast ? (
              <button
                onClick={goNext}
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create farm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}