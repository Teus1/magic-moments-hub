import * as React from "react";
import { CalendarDays, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

interface PickerFieldProps extends React.ComponentProps<"input"> {
  variant: "date" | "time";
}

/**
 * Campo de data/hora com melhor affordance: ícone visível, clique em qualquer
 * ponto abre o seletor nativo e destaque de foco na cor da marca.
 */
export function PickerField({ variant, className, ...props }: PickerFieldProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const Icon = variant === "date" ? CalendarDays : Clock;

  function openPicker(event: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    // Evita que o clique no wrapper roube o foco / feche o seletor recém-aberto
    event.preventDefault();
    el.focus();
    try {
      (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      /* navegador sem suporte: o input segue editável normalmente */
    }
  }

  return (
    <div
      onMouseDown={openPicker}
      className={cn(
        "group flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card/70 px-3.5 text-sm shadow-xs backdrop-blur-xl transition-colors",
        "hover:border-primary/50 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20",
        className,
      )}
    >
      <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <input
        {...props}
        ref={ref}
        type={variant}
        onMouseDown={(e) => {
          props.onMouseDown?.(e);
        }}
        className={cn(
          "w-full cursor-pointer bg-transparent outline-none",
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute",
          !props.value && "text-muted-foreground",
        )}
      />
    </div>
  );

}
