import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", loading, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-2xl font-medium transition shadow-soft disabled:opacity-60 disabled:cursor-not-allowed";
    const variants: Record<string,string> = {
      default: "bg-brand text-white hover:opacity-90",
      outline: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
      ghost: "text-gray-700 hover:bg-gray-100",
      destructive: "bg-red-600 text-white hover:bg-red-700"
    };
   const sizes: Record<string,string> = {
  sm: "px-3 py-2 text-sm",     // +4px de altura
  md: "px-4 py-3",             // confort touch
  lg: "px-6 py-4 text-lg"
};

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading ? "..." : children}
      </button>
    );
  }
);
Button.displayName = "Button";
