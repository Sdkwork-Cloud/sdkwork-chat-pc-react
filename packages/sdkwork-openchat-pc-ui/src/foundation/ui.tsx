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
  default: "bg-[var(--ai-primary)] text-white hover:brightness-110",
  primary: "bg-[var(--ai-primary)] text-white hover:brightness-110",
  secondary:
    "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]",
  outline:
    "bg-transparent text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--ai-primary)] hover:text-[var(--ai-primary)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  warning: "bg-amber-500 text-black hover:bg-amber-400",
  link: "bg-transparent text-[var(--ai-primary)] underline-offset-4 hover:underline",
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
    ...props
  },
  ref,
) {
  const resolvedVariant = variant ?? (className ? "unstyled" : "primary");
  const isUnstyled = resolvedVariant === "unstyled";

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "appearance-none border-0 bg-transparent font-inherit text-inherit transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        !isUnstyled &&
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium active:scale-[0.98]",
        !isUnstyled && buttonVariantClass[resolvedVariant],
        !isUnstyled && buttonSizeClass[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leadingIcon}
      {children}
      {!loading ? trailingIcon : null}
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
    "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
  filled:
    "bg-[var(--bg-secondary)] border border-transparent text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
  outlined:
    "bg-transparent border border-[var(--border-color)] text-[var(--text-primary)] focus-within:border-[var(--ai-primary)] focus-within:ring-2 focus-within:ring-[var(--ai-primary-soft)]",
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
            ? "h-4 w-4 rounded border-[var(--border-color)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]"
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
        "w-full bg-transparent outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed",
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
        "min-h-[96px] w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] disabled:cursor-not-allowed disabled:opacity-60",
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
        "h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--ai-primary)] focus:ring-1 focus:ring-[var(--ai-primary)] disabled:cursor-not-allowed disabled:opacity-60",
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
        "mt-0.5 h-4 w-4 rounded border-[var(--border-color)] text-[var(--ai-primary)] focus:ring-[var(--ai-primary)]",
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
        checked ? "bg-[var(--ai-primary)]" : "bg-[var(--bg-tertiary)]",
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
      className={cn("text-sm font-medium text-[var(--text-secondary)]", className)}
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
  info: "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
  success: "border-[var(--ai-success)]/30 bg-[var(--ai-success-soft)] text-[var(--ai-success)]",
  warning: "border-[var(--ai-warning)]/30 bg-[var(--ai-warning-soft)] text-[var(--ai-warning)]",
  error: "border-[var(--ai-error)]/30 bg-[var(--ai-error-soft)] text-[var(--ai-error)]",
};

export const StatusNotice = forwardRef<HTMLDivElement, StatusNoticeProps>(
  function StatusNotice({ className, tone = "info", title, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("rounded-xl border p-3", noticeToneClass[tone], className)}
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
        "flex items-center justify-center gap-3 py-8 text-sm text-[var(--text-muted)]",
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
        "rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center",
        className,
      )}
      {...props}
    >
      {title ? <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div> : null}
      {description ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
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
  default: "bg-[var(--ai-primary-soft)] text-[var(--ai-primary-light)]",
  secondary: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  success: "bg-[var(--ai-success-soft)] text-[var(--ai-success)]",
  warning: "bg-[var(--ai-warning-soft)] text-[var(--ai-warning)]",
  error: "bg-[var(--ai-error-soft)] text-[var(--ai-error)]",
  outline: "border border-[var(--border-color)] text-[var(--text-secondary)]",
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
        className={cn("border-0 border-t border-[var(--border-color)]", className)}
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

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex p-4",
        placement === "top" ? "items-start justify-center" : "items-center justify-center",
        "bg-black/55",
        overlayClassName,
      )}
    >
      <div className="absolute inset-0" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl",
          widthClass,
          contentClassName,
        )}
        style={panelStyle}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <Button
              aria-label={tr("Close modal")}
              variant="unstyled"
              onClick={onClose}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              x
            </Button>
          </div>
        ) : null}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
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
    <div className="fixed inset-0 z-50 flex bg-black/55">
      <div className="absolute inset-0" onClick={closeOnOverlayClick ? onClose : undefined} />
      <div
        className={cn(
          "relative flex h-full max-w-[90vw] flex-col bg-[var(--bg-primary)] shadow-2xl",
          side === "left" ? "mr-auto border-r border-[var(--border-color)]" : "ml-auto border-l border-[var(--border-color)]",
          contentClassName,
        )}
        style={{ width }}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <Button
              aria-label={tr("Close drawer")}
              variant="unstyled"
              onClick={onClose}
              className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              x
            </Button>
          </div>
        ) : null}
        <div className={cn("flex-1 overflow-auto", bodyClassName)}>{children}</div>
        {footer ? (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4">
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
        "rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm",
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
        "text-lg font-semibold leading-none tracking-tight text-[var(--text-primary)]",
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
      <p ref={ref} className={cn("text-sm text-[var(--text-muted)]", className)} {...props}>
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
