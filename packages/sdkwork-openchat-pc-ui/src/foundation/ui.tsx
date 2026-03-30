import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@sdkwork/openchat-pc-kernel";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { useTheme, type ThemeType } from "./theme";

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive"
  | "success"
  | "warning"
  | "link"
  | "unstyled";
export type ButtonSize =
  | "small"
  | "default"
  | "large"
  | "sm"
  | "md"
  | "lg"
  | "icon";

const buttonVariantClass: Record<ButtonVariant, string> = {
  default: "bg-primary-600 text-white shadow-sm hover:bg-primary-700",
  primary: "bg-primary-600 text-white shadow-sm hover:bg-primary-700",
  secondary:
    "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
  outline:
    "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600",
  warning: "bg-amber-500 text-zinc-950 shadow-sm hover:bg-amber-400",
  link: "bg-transparent text-primary-600 underline-offset-4 hover:underline dark:text-primary-400",
  unstyled: "",
};

const buttonSizeClass: Record<ButtonSize, string> = {
  small: "h-7 px-3 text-xs",
  sm: "h-7 px-3 text-xs",
  default: "h-9 px-4 text-sm",
  md: "h-9 px-4 text-sm",
  large: "h-11 px-6 text-base",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      {...props}
    />
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size = "default",
    type = "button",
    loading = false,
    disabled,
    children,
    leadingIcon,
    trailingIcon,
    icon,
    iconPosition = "left",
    ...props
  },
  ref,
) {
  const resolvedVariant = variant ?? (className ? "unstyled" : "primary");
  const isUnstyled = resolvedVariant === "unstyled";
  const resolvedLeadingIcon = leadingIcon ?? (iconPosition === "left" ? icon : null);
  const resolvedTrailingIcon = trailingIcon ?? (iconPosition === "right" ? icon : null);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "appearance-none border-0 bg-transparent font-inherit text-inherit transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        !isUnstyled &&
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
        !isUnstyled && buttonVariantClass[resolvedVariant],
        !isUnstyled && buttonSizeClass[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : resolvedLeadingIcon}
      {children}
      {!loading ? resolvedTrailingIcon : null}
    </button>
  );
});

export type InputSize = "small" | "default" | "large";
export type InputVariant = "default" | "filled" | "outlined";

const inputSizeClass: Record<InputSize, string> = {
  small: "h-8 px-3 text-xs",
  default: "h-10 px-3 text-sm",
  large: "h-11 px-4 text-base",
};

const inputVariantClass: Record<InputVariant, string> = {
  default:
    "border border-zinc-200 bg-white text-zinc-900 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-within:ring-offset-zinc-950",
  filled:
    "border border-transparent bg-zinc-100 text-zinc-900 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:bg-zinc-900 dark:text-zinc-100 dark:focus-within:ring-offset-zinc-950",
  outlined:
    "border border-zinc-200 bg-transparent text-zinc-900 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-zinc-800 dark:text-zinc-100 dark:focus-within:ring-offset-zinc-950",
};

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  size?: InputSize;
  variant?: InputVariant;
  prefix?: ReactNode;
  suffix?: ReactNode;
  allowClear?: boolean;
  inputClassName?: string;
  containerClassName?: string;
  onValueChange?: (value: string) => void;
}

function isBooleanLikeInput(type?: string): boolean {
  return (
    type === "checkbox" ||
    type === "radio" ||
    type === "range" ||
    type === "color" ||
    type === "file"
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    inputClassName,
    containerClassName,
    size = "default",
    variant = "default",
    prefix,
    suffix,
    allowClear = false,
    type = "text",
    value,
    defaultValue,
    disabled,
    readOnly,
    onChange,
    onValueChange,
    ...props
  },
  ref,
) {
  const { tr } = useAppTranslation();

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  if (isBooleanLikeInput(type)) {
    return (
      <input
        ref={ref}
        type={type}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
        onChange={handleChange}
        className={cn(
          type === "checkbox" || type === "radio"
            ? "h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-700 dark:text-primary-400"
            : "",
          className,
        )}
        {...props}
      />
    );
  }

  const inputNode = (
    <input
      ref={ref}
      type={type}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      readOnly={readOnly}
      onChange={handleChange}
      className={cn(
        "w-full bg-transparent outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed dark:placeholder:text-zinc-400",
        inputSizeClass[size],
        prefix ? "pl-2" : "",
        suffix || allowClear ? "pr-2" : "",
        !prefix && !suffix && !allowClear && !containerClassName
          ? cn("rounded-xl", inputVariantClass[variant], className)
          : inputClassName || className,
        inputClassName,
      )}
      {...props}
    />
  );

  if (!prefix && !suffix && !allowClear && !containerClassName) {
    return inputNode;
  }

  const currentValue =
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : "";

  return (
    <div
      className={cn(
        "flex w-full items-center rounded-xl transition-all",
        inputVariantClass[variant],
        containerClassName,
      )}
    >
      {prefix ? (
        <span className="ml-3 flex shrink-0 items-center text-[var(--text-tertiary)]">
          {prefix}
        </span>
      ) : null}
      {inputNode}
      {allowClear && currentValue && !disabled && !readOnly ? (
        <Button
          type="button"
          variant="unstyled"
          aria-label={tr("Clear input")}
          onClick={() => onValueChange?.("")}
          className="mr-2 rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          x
        </Button>
      ) : null}
      {suffix ? (
        <span className="mr-3 flex shrink-0 items-center text-[var(--text-tertiary)]">
          {suffix}
        </span>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, onChange, onValueChange, ...props },
  ref,
) {
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <textarea
      ref={ref}
      onChange={handleChange}
      className={cn(
        "min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:ring-offset-zinc-950",
        className,
      )}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, onChange, onValueChange, children, ...props },
  ref,
) {
  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <select
      ref={ref}
      onChange={handleChange}
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-offset-zinc-950",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, children, ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-700 dark:text-primary-400",
        className,
      )}
      {...props}
    />
  );

  if (!label && !description && !children) {
    return control;
  }

  return (
    <label className="flex items-start gap-2">
      {control}
      <span className="space-y-0.5">
        {label || children ? (
          <span className="block text-sm text-[var(--text-primary)]">{label || children}</span>
        ) : null}
        {description ? (
          <span className="block text-xs text-[var(--text-muted)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
});

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-primary-600 dark:bg-primary-500" : "bg-zinc-200 dark:bg-zinc-700",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

export interface LabelProps extends HTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, children, ...props },
  ref,
) {
  return (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-zinc-900 dark:text-zinc-100", className)}
      {...props}
    >
      {children}
    </label>
  );
});

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(function Form(
  { className, children, ...props },
  ref,
) {
  return (
    <form ref={ref} className={cn("space-y-4", className)} {...props}>
      {children}
    </form>
  );
});

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
});

export const FieldGroup = forwardRef<HTMLDivElement, FieldProps>(function FieldGroup(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("grid gap-3", className)} {...props}>
      {children}
    </div>
  );
});

export const FieldLabel = forwardRef<HTMLLabelElement, LabelProps>(function FieldLabel(
  { className, children, ...props },
  ref,
) {
  return (
    <Label ref={ref} className={cn("mb-0 block", className)} {...props}>
      {children}
    </Label>
  );
});

export const FieldDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FieldDescription({ className, children, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-xs text-[var(--text-muted)]", className)} {...props}>
        {children}
      </p>
    );
  },
);

export const FieldMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function FieldMessage({ className, children, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-xs text-[var(--ai-error)]", className)} {...props}>
        {children}
      </p>
    );
  },
);

export const FormItem = Field;
export const FormLabel = FieldLabel;
export const FormControl = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function FormControl({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    );
  },
);
export const FormDescription = FieldDescription;
export const FormMessage = FieldMessage;

export interface StatusNoticeProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  children?: ReactNode;
}

const noticeToneClass: Record<NonNullable<StatusNoticeProps["tone"]>, string> = {
  info: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
};

export const StatusNotice = forwardRef<HTMLDivElement, StatusNoticeProps>(
  function StatusNotice({ className, tone = "info", title, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("rounded-2xl border p-4", noticeToneClass[tone], className)}
        {...props}
      >
        {title ? <div className="mb-1 text-sm font-semibold">{title}</div> : null}
        {children ? <div className="text-sm">{children}</div> : null}
      </div>
    );
  },
);

export interface LoadingBlockProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
}

export const LoadingBlock = forwardRef<HTMLDivElement, LoadingBlockProps>(function LoadingBlock(
  { className, label, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-3 py-8 text-sm text-zinc-500 dark:text-zinc-400",
        className,
      )}
      {...props}
    >
      <Spinner />
      {label}
    </div>
  );
});

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { className, title, description, actions, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[1.75rem] border border-dashed border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
      {...props}
    >
      {title ? <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</div> : null}
      {description ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      ) : null}
      {children}
      {actions ? <div className="mt-4 flex items-center justify-center gap-3">{actions}</div> : null}
    </div>
  );
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "outline";
}

const badgeVariantClass: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-200",
  secondary: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  error: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  outline: "border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = "default", children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badgeVariantClass[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
});

export const Separator = forwardRef<HTMLHRElement, HTMLAttributes<HTMLHRElement>>(
  function Separator({ className, ...props }, ref) {
    return (
      <hr
        ref={ref}
        className={cn("border-0 border-t border-zinc-200 dark:border-zinc-800", className)}
        {...props}
      />
    );
  },
);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  customWidth?: string;
  customHeight?: string;
  bodyClassName?: string;
  contentClassName?: string;
  overlayClassName?: string;
  placement?: "center" | "top";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  customWidth,
  customHeight,
  bodyClassName,
  contentClassName,
  overlayClassName,
  placement = "center",
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const { tr } = useAppTranslation();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
        ? "max-w-3xl"
        : size === "xl"
          ? "max-w-5xl"
          : "max-w-xl";

  const panelStyle: CSSProperties = {};
  if (customWidth) {
    panelStyle.width = customWidth;
    panelStyle.maxWidth = "95vw";
  }
  if (customHeight) {
    panelStyle.height = customHeight;
  }

  const modalNode = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex p-4",
        placement === "top" ? "items-start justify-center" : "items-center justify-center",
        "bg-zinc-950/45 backdrop-blur-sm",
        overlayClassName,
      )}
    >
      <div className="absolute inset-0" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "relative mx-auto flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-950/12 dark:border-zinc-800 dark:bg-zinc-900",
          widthClass,
          contentClassName,
        )}
        style={panelStyle}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
            <Button
              aria-label={tr("Close modal")}
              variant="unstyled"
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              x
            </Button>
          </div>
        ) : null}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-zinc-100 bg-zinc-50/70 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-950/50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return typeof document === "undefined" ? modalNode : createPortal(modalNode, document.body);
}

export interface DrawerProps extends Omit<ModalProps, "size"> {
  side?: "left" | "right";
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  side = "right",
  width = "420px",
  bodyClassName,
  contentClassName,
  closeOnOverlayClick = true,
}: DrawerProps) {
  const { tr } = useAppTranslation();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950/45 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        className={cn(
          "relative flex h-full max-w-[90vw] flex-col rounded-[28px] border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-950/12 dark:border-zinc-800 dark:bg-zinc-900",
          side === "left" ? "mr-auto border-r" : "ml-auto border-l",
          contentClassName,
        )}
        style={{ width }}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
            <Button
              aria-label={tr("Close drawer")}
              variant="unstyled"
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              x
            </Button>
          </div>
        ) : null}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-zinc-100 bg-zinc-50/70 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-950/50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const Dialog = Modal;
export const Popup = Modal;

export interface ModalButtonGroupProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ModalButtonGroup({
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmVariant = "primary",
  isLoading = false,
  disabled = false,
}: ModalButtonGroupProps) {
  const { tr } = useAppTranslation();
  const cancelLabel = tr(cancelText);
  const confirmLabel = tr(confirmText);

  return (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        onClick={onConfirm}
        disabled={disabled || isLoading}
        loading={isLoading}
      >
        {isLoading ? tr("Loading...") : confirmLabel}
      </Button>
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[1.5rem] border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export const SectionCard = Card;

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
      {children}
    </div>
  );
});

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
});

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, children, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)} {...props}>
        {children}
      </p>
    );
  },
);

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props}>
        {children}
      </div>
    );
  },
);

interface ThemeSelectorProps {
  className?: string;
  direction?: "horizontal" | "vertical";
  size?: "small" | "medium" | "large";
}

const themePalette: Record<ThemeType, { label: string; preview: string }> = {
  dark: { label: "Dark", preview: "linear-gradient(135deg, #0A0A0A 50%, #3B82F6 50%)" },
  light: { label: "Light", preview: "linear-gradient(135deg, #F8FAFC 50%, #2563EB 50%)" },
  blue: { label: "Blue", preview: "linear-gradient(135deg, #122B3D 50%, #06B6D4 50%)" },
  purple: { label: "Purple", preview: "linear-gradient(135deg, #251B35 50%, #8B5CF6 50%)" },
  system: { label: "System", preview: "linear-gradient(135deg, #0A0A0A 50%, #F8FAFC 50%)" },
};

export function ThemeSelector({
  className,
  direction = "horizontal",
  size = "medium",
}: ThemeSelectorProps) {
  const { tr } = useAppTranslation();
  const { currentTheme, setTheme } = useTheme();

  const sizeClass =
    size === "small"
      ? { tile: "h-8 w-8", label: "text-xs", gap: "gap-2" }
      : size === "large"
        ? { tile: "h-14 w-14", label: "text-sm", gap: "gap-4" }
        : { tile: "h-11 w-11", label: "text-sm", gap: "gap-3" };

  const themes: ThemeType[] = ["dark", "light", "blue", "purple", "system"];

  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        sizeClass.gap,
        className,
      )}
    >
      {themes.map((themeKey) => {
        const active = themeKey === currentTheme;
        const meta = themePalette[themeKey];
        const label = tr(meta.label);

        return (
          <Button
            key={themeKey}
            type="button"
            variant="unstyled"
            className={cn(
              "group flex flex-col items-center gap-1.5 rounded-lg transition-all",
              direction === "vertical" ? "w-full flex-row p-2 hover:bg-[var(--bg-tertiary)]" : "",
            )}
            onClick={() => setTheme(themeKey)}
            title={label}
          >
            <div
              className={cn(
                "rounded-lg border-2 border-transparent transition-all",
                sizeClass.tile,
                active
                  ? "scale-105 border-[var(--ai-primary)] shadow-md"
                  : "group-hover:border-[var(--border-medium)]",
              )}
              style={{ background: meta.preview }}
            />
            <span
              className={cn(
                "font-medium text-[var(--text-secondary)] transition-colors",
                sizeClass.label,
                active
                  ? "text-[var(--ai-primary)]"
                  : "group-hover:text-[var(--text-primary)]",
              )}
            >
              {label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
