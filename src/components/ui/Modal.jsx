import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-xl" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-ink/60 z-50 flex items-end md:items-center justify-center p-2 md:p-6"
      onClick={onClose}
    >
      <div
        className={`bg-paper border-2 border-ink w-full ${maxWidth} max-h-[95vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-paper border-b-2 border-ink px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-display text-2xl font-black leading-none">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 border border-ink hover:bg-ink hover:text-paper inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-paper border-t-2 border-ink px-4 py-3 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
