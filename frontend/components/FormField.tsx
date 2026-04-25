import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "textarea";

interface FormFieldProps {
  label: string;
  name: string;
  type?: FormFieldType;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | number;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  className?: string;
  inputClassName?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
  maxLength?: number;
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  error,
  required = false,
  disabled = false,
  value,
  onChange,
  className,
  inputClassName,
  step,
  min,
  max,
  maxLength,
}: FormFieldProps) {
  const inputBase =
    "w-full px-4 py-3 rounded-xl border border-gray-300 transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
  const errorClasses = error
    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
    : "";

  return (
    <div className={className}>
      <Label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {type === "textarea" ? (
        <Textarea
          id={name}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          rows={4}
          maxLength={maxLength}
          className={cn(inputBase, errorClasses, inputClassName)}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          step={step}
          min={min}
          max={max}
          maxLength={maxLength}
          className={cn(inputBase, errorClasses, inputClassName)}
        />
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}