import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "custom";
export type ModalVariant = "default" | "centered" | "right" | "left";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  customWidth?: string;
  customHeight?: string;
  variant?: ModalVariant;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showOverlay?: boolean;
  overlayClassName?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onOpen?: () => void;
  onAfterClose?: () => void;
}

const sizeMap: Record<ModalSize, string> = {
  sm: "w-[400px]",
  md: "w-[500px]",
  lg: "w-[600px]",
  xl: "w-[750px]",
  "2xl": "w-[850px]",
  full: "h-[90vh] w-[95vw]",
  custom: "",
};

const variantMap: Record<ModalVariant, string> = {
  default: "",
  centered: "items-center justify-center",
  right: "items-center justify-end pr-4",
  left: "items-center justify-start pl-4",
};

export function Modal({
  isOpen,
  onClose,
  size = "md",
  customWidth,
  customHeight,
  variant = "centered",
  title,
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showOverlay = true,
  overlayClassName = "",
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  onOpen,
  onAfterClose,
}: ModalProps) {
  const { tr } = useAppTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      onOpen?.();
      window.setTimeout(() => modalRef.current?.focus(), 0);
      return;
    }
    onAfterClose?.();
  }, [isOpen, onAfterClose, onOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEsc && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [closeOnEsc, isOpen, onClose]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose],
  );

  if (!isOpen) return null;

  const sizeClass = size === "custom" && customWidth ? "" : sizeMap[size];
  const widthStyle = customWidth ? { width: customWidth } : undefined;
  const heightStyle = customHeight ? { height: customHeight } : undefined;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex ${variantMap[variant]} ${showOverlay ? "bg-black/60 backdrop-blur-md" : ""} ${overlayClassName} animate-in fade-in duration-300`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`animate-in zoom-in-95 flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-2xl duration-300 ${sizeClass} ${className}`}
        style={{ ...widthStyle, ...heightStyle }}
      >
        {title || showCloseButton ? (
          <div
            className={`flex flex-shrink-0 items-center justify-between border-b border-border bg-bg-secondary/50 px-6 py-5 backdrop-blur-sm ${headerClassName}`}
          >
            {title ? <h2 className="text-lg font-bold tracking-tight text-text-primary">{title}</h2> : null}
            {showCloseButton ? (
              <button
                onClick={onClose}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all duration-200 hover:bg-bg-hover hover:text-text-primary"
                aria-label={tr("Close")}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={`flex-1 overflow-hidden ${bodyClassName}`}>{children}</div>

        {footer ? (
          <div
            className={`flex-shrink-0 border-t border-border bg-bg-secondary/80 px-6 py-4 backdrop-blur-sm ${footerClassName}`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

export function ModalBody({
  children,
  className = "",
  scrollable = true,
}: {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  return (
    <div className={`flex-1 ${scrollable ? "overflow-y-auto scrollbar-thin scrollbar-thumb-border-medium" : "overflow-hidden"} ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className = "",
  align = "right",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass = align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";

  return (
    <div className={`flex flex-shrink-0 items-center border-t border-border bg-bg-secondary px-6 py-4 ${alignClass} ${className}`}>
      {children}
    </div>
  );
}

export function ModalButtonGroup({
  onCancel,
  onConfirm,
  cancelText,
  confirmText,
  isLoading = false,
  disabled = false,
  confirmVariant = "primary",
  showCancel = true,
  showConfirm = true,
  children,
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  confirmVariant?: "primary" | "success" | "danger";
  showCancel?: boolean;
  showConfirm?: boolean;
  children?: ReactNode;
}) {
  const { tr } = useAppTranslation();
  const resolvedCancelText = cancelText ?? tr("Cancel");
  const resolvedConfirmText = confirmText ?? tr("Confirm");

  const variantClass =
    confirmVariant === "success"
      ? "bg-success hover:bg-green-600 shadow-glow-success"
      : confirmVariant === "danger"
        ? "bg-error hover:bg-red-600 shadow-glow-error"
        : "bg-primary hover:bg-primary-hover shadow-glow-primary";

  return (
    <div className="flex items-center space-x-3">
      {children}
      {showCancel && onCancel ? (
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-xl border border-border px-5 py-2 text-[14px] text-text-secondary transition-all duration-200 hover:bg-bg-hover hover:text-text-primary disabled:opacity-50"
        >
          {resolvedCancelText}
        </button>
      ) : null}
      {showConfirm && onConfirm ? (
        <button
          onClick={onConfirm}
          disabled={isLoading || disabled}
          className={`active:scale-95 flex items-center rounded-xl px-6 py-2 text-[14px] font-medium text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
        >
          {isLoading ? (
            <svg className="-ml-1 mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : null}
          {resolvedConfirmText}
        </button>
      ) : null}
    </div>
  );
}

export default Modal;
