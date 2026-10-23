import { useEffect, useRef, type ReactNode } from "react";

/** Native <dialog> modal: focus trap, Esc to close and inert background come for free. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-sm border border-line bg-ink-900 p-0 text-bone shadow-2xl backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm ${
        wide ? "max-w-5xl" : "max-w-lg"
      }`}
    >
      {open && (
        <div className="p-6 sm:p-10">
          <div className="flex items-start justify-between gap-6">
            <h2 id="modal-title" className="text-4xl">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 flex h-11 w-11 flex-none items-center justify-center text-stone-300 hover:text-gold-soft">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
                <path d="M2 2l12 12M14 2 2 14" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      )}
    </dialog>
  );
}
