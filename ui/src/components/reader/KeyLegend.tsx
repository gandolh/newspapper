/**
 * The `?` legend: every Reader key, in the existing `Modal`.
 */
import { Modal } from "../ui";
import { READER_KEYS } from "./keys";

export function KeyLegend({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width={440}>
      <dl className="flex flex-col">
        {READER_KEYS.map((entry) => (
          <div
            className="grid min-h-unit grid-cols-[calc(var(--spacing-unit)*3)_1fr] items-center gap-half border-b border-hairline"
            key={entry.action}
          >
            <dt className="flex items-center gap-[4px]">
              {entry.keys.map((k, i) => (
                <span key={k} className="inline-flex items-center gap-[4px] font-galley text-[10px] text-graphite-soft">
                  {i > 0 && <span aria-hidden="true">+</span>}
                  <kbd className="inline-flex h-[20px] min-w-[20px] items-center justify-center border border-tick bg-paper px-[5px] font-galley text-[11px] font-bold text-graphite">
                    {k}
                  </kbd>
                </span>
              ))}
            </dt>
            <dd className="text-label text-graphite">{entry.label}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-half font-galley text-[10px] leading-[1.45] text-graphite-soft">
        Keys do nothing while you are typing in a field. Esc leaves the filter.
      </p>
    </Modal>
  );
}
