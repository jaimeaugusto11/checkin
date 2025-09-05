import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
  "w-full rounded-2xl border border-gray-300 bg-white px-3 py-3", // py-3
  "outline-none focus:ring-2 focus:ring-brand/40",
  "text-base" // fontes legíveis em ecrã pequeno
)}
      {...props}
    />
  )
);
Input.displayName = "Input";
