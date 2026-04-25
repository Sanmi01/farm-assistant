import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        next[2] = "Coordinates are out of valid range.";
        ok = false;
      } else if (latitude === 0 && longitude === 0) {
        next[2] = "Coordinates (0, 0) is not a valid farm location.";
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 py-8">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-emerald-100 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <Sprout className="h-7 w-7 text-emerald-600" />
              <span className="text-xl font-semibold text-gray-900">
                Farm Assistant
              </span>
            </Link>
            <Link
              href="/farms"
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to farms</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProgressBar
          currentStep={currentStep}
          totalSteps={4}
          labels={STEP_LABELS}
          className="mb-8"
        />

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-8 shadow-xl">
          <div className="min-h-[320px] mb-8">
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
            <Button
              type="button"
              onClick={goBack}
              disabled={isFirst || submitting}
              variant="ghost"
              className="text-gray-600 hover:text-gray-900"
            >
              Back
            </Button>
            {!isLast ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating farm...</span>
                  </>
                ) : (
                  "Create farm"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}