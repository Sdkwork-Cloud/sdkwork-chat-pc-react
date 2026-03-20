import { createElement, type ComponentProps } from "react";
import { Toaster as SonnerToaster, toast } from "sonner";

export type ToastType = "success" | "error" | "warning" | "info";

export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  return createElement(SonnerToaster, {
    position: "top-right",
    richColors: true,
    closeButton: true,
    toastOptions: {
      className: "border border-border bg-bg-secondary text-text-primary",
    },
    ...props,
  });
}

export function useToast() {
  const showToast = (message: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      default:
        toast.info(message);
        break;
    }
  };

  return { showToast, toast };
}
