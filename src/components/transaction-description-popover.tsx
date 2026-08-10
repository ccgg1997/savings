"use client";

import { Info } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PopoverPosition = {
  arrowLeft: number;
  left: number;
  placement: "above" | "below";
  top: number;
};

export function TransactionDescriptionPopover({ description }: { description: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const button = buttonRef.current;
      const popover = popoverRef.current;
      if (!button || !popover) return;

      const margin = 12;
      const gap = 8;
      const buttonRect = button.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const maxLeft = Math.max(margin, window.innerWidth - popoverRect.width - margin);
      const left = Math.min(Math.max(buttonCenter - popoverRect.width / 2, margin), maxLeft);
      const placement = window.innerHeight - buttonRect.bottom < popoverRect.height + gap + margin && buttonRect.top > popoverRect.height + gap + margin
        ? "above"
        : "below";

      setPosition({
        arrowLeft: Math.min(Math.max(buttonCenter - left, 14), popoverRect.width - 14),
        left,
        placement,
        top: placement === "above" ? buttonRect.top - gap : buttonRect.bottom + gap,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-controls={open ? popoverId : undefined}
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        aria-label="Ver descripción del movimiento"
        onClick={() => {
          setPosition(null);
          setOpen((current) => !current);
        }}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="tooltip"
              style={position ? {
                left: position.left,
                top: position.top,
                transform: position.placement === "above" ? "translateY(-100%)" : undefined,
              } : { left: 0, top: 0, visibility: "hidden" }}
              className="fixed z-[70] w-max max-w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card px-3 py-2.5 text-left normal-case tracking-normal text-card-foreground shadow-xl"
            >
              <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-primary">Descripción</span>
              <span className="mt-1 block text-[11px] font-medium leading-5 text-card-foreground">{description || "Sin descripción"}</span>
              {position ? (
                <span
                  aria-hidden="true"
                  style={{ left: position.arrowLeft }}
                  className={`absolute size-3 -translate-x-1/2 rotate-45 bg-card ${position.placement === "above" ? "-bottom-1.5 border-b border-r border-border" : "-top-1.5 border-l border-t border-border"}`}
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
