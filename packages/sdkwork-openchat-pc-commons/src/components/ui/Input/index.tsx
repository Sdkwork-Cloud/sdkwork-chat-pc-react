

import React, { useState, useCallback, forwardRef } from "react";
import type { BaseFormProps } from "../../../types/common";


export type InputSize = "small" | "default" | "large";
export type InputVariant = "default" | "filled" | "outlined";

export interface InputProps extends BaseFormProps<string> {
  
  type?: "text" | "password" | "email" | "number" | "tel" | "url" | "search";
  
  size?: InputSize;
  
  variant?: InputVariant;
  
  prefix?: React.ReactNode;
  
  suffix?: React.ReactNode;
  
  allowClear?: boolean;
  
  max?: number;
  
  min?: number;
  
  maxLength?: number;
  
  autoFocus?: boolean;
  
  autoComplete?: string;
  
  name?: string;
  
  id?: string;
  
  onInput?: (e: React.FormEvent<HTMLInputElement>) => void;
  
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}


const sizeStyles: Record<InputSize, string> = {
  small: "h-7 px-2 text-xs",
  default: "h-9 px-3 text-sm",
  large: "h-11 px-4 text-base",
};

const variantStyles: Record<InputVariant, string> = {
  default:
    "bg-bg-tertiary/80 border border-border text-text-primary placeholder:text-text-muted focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-lg",
  filled:
    "bg-bg-tertiary border border-transparent text-text-primary placeholder:text-text-muted focus-within:bg-bg-secondary focus-within:border-primary rounded-lg",
  outlined:
    "bg-transparent border border-border text-text-primary placeholder:text-text-muted focus-within:border-primary rounded-lg",
};



export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      value,
      defaultValue,
      onChange,
      placeholder,
      disabled = false,
      readOnly = false,
      type = "text",
      size = "default",
      variant = "default",
      prefix,
      suffix,
      allowClear = false,
      max,
      min,
      maxLength,
      autoFocus = false,
      autoComplete,
      name,
      id,
      className,
      style,
      onInput,
      onFocus,
      onBlur,
      onKeyDown,
      onKeyUp,
      onPressEnter,
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : innerValue;

      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (!isControlled) {
          setInnerValue(newValue);
        }
        onChange?.(newValue);
      },
      [isControlled, onChange],
    );

    const handleClear = useCallback(() => {
      if (!isControlled) {
        setInnerValue("");
      }
      onChange?.("");
    }, [isControlled, onChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          onPressEnter?.(e);
        }
        onKeyDown?.(e);
      },
      [onKeyDown, onPressEnter],
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    const showClear = allowClear && currentValue && !disabled && !readOnly;

    const wrapperClasses = [
      "relative flex items-center w-full",
      "transition-all duration-200",
      variantStyles[variant],
      focused ? "border-primary ring-2 ring-primary/20" : "",
      disabled ? "bg-bg-tertiary cursor-not-allowed opacity-60" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "flex-1 w-full bg-transparent outline-none",
      sizeStyles[size],
      "placeholder:text-text-muted",
      disabled ? "cursor-not-allowed" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses} style={style}>
        {}
        {prefix && (
          <span className="flex-shrink-0 mr-2 text-text-secondary">
            {prefix}
          </span>
        )}

        {}
        <input
          ref={ref}
          type={type}
          value={currentValue}
          onChange={handleChange}
          onInput={onInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onKeyUp={onKeyUp}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          max={max}
          min={min}
          maxLength={maxLength}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          name={name}
          id={id}
          className={inputClasses}
        />

        {}
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="flex-shrink-0 ml-2 p-0.5 text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {}
        {suffix && (
          <span className="flex-shrink-0 ml-2 text-text-secondary">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;

