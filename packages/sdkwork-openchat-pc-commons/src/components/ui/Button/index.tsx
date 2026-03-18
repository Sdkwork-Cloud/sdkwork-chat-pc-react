

import React from "react";
import type { BaseComponentProps } from "../../../types/common";


export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive";
export type ButtonSize = "default" | "small" | "large" | "sm" | "icon";
export type ButtonShape = "default" | "circle" | "round";

export interface ButtonProps extends BaseComponentProps {
  
  variant?: ButtonVariant;
  
  size?: ButtonSize;
  
  shape?: ButtonShape;
  
  disabled?: boolean;
  
  loading?: boolean;
  
  block?: boolean;
  
  icon?: React.ReactNode;
  
  iconPosition?: "left" | "right";
  
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  type?: "button" | "submit" | "reset";
  
  title?: string;
}


const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:scale-105 hover:shadow-lg active:bg-primary-dark shadow-glow-primary hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
  secondary:
    "bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary hover:border-primary-light hover:scale-[1.02]",
  outline:
    "bg-transparent border border-border text-text-primary hover:border-primary hover:text-primary hover:bg-primary/5 hover:scale-[1.02]",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-secondary hover:text-text-primary hover:scale-[1.02]",
  danger:
    "bg-error text-white hover:bg-red-600 hover:scale-105 hover:shadow-lg active:bg-red-700 shadow-glow-error hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
  destructive:
    "bg-error text-white hover:bg-red-600 hover:scale-105 hover:shadow-lg active:bg-red-700 shadow-glow-error hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm h-9",
  small: "px-3 py-1.5 text-xs h-7",
  sm: "px-3 py-1.5 text-xs h-7",
  large: "px-6 py-2.5 text-base h-11",
  icon: "h-9 w-9 p-0",
};

const shapeStyles: Record<ButtonShape, string> = {
  default: "rounded-md",
  circle: "rounded-full w-9 h-9 p-0",
  round: "rounded-full",
};



export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "default",
      shape = "default",
      disabled = false,
      loading = false,
      block = false,
      icon,
      iconPosition = "left",
      onClick,
      type = "button",
      className,
      style,
      title,
    },
    ref,
  ) => {
    const classes = [
      "inline-flex items-center justify-center font-medium transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-bg-primary",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
      "active:scale-[0.98] active:brightness-90 transform",
      variantStyles[variant],
      sizeStyles[size],
      shapeStyles[shape],
      block ? "w-full" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const loadingIcon = (
      <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        style={style}
        onClick={handleClick}
        disabled={disabled || loading}
        title={title}
      >
        {}
        {loading && loadingIcon}

        {}
        {!loading && icon && iconPosition === "left" && (
          <span className="mr-2">{icon}</span>
        )}

        {}
        {children}

        {}
        {!loading && icon && iconPosition === "right" && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;

