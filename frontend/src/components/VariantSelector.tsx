import type { Transform } from "../lib/types";
import { TRANSFORMS, TRANSFORM_ORDER } from "../lib/transforms";

interface Props {
  selected: Set<Transform["name"]>;
  onToggle: (name: Transform["name"]) => void;
  disabled?: boolean;
}

export function VariantSelector({ selected, onToggle, disabled }: Props) {
  return (
    <div>
      <div className="mb-2 text-sm text-ink-soft">Variants</div>
      <div className="grid grid-cols-3 gap-2">
        {TRANSFORM_ORDER.map((name) => {
          const t = TRANSFORMS[name];
          const isOn = selected.has(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={isOn}
              disabled={disabled}
              onClick={() => onToggle(name)}
              className={`group relative rounded-md border px-4 py-3 text-left transition-colors ${
                isOn
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 bg-paper text-ink hover:border-ink/40"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <div className="font-display text-lg font-semibold tracking-tight">
                {name}
              </div>
              <div
                className={`mt-1 font-mono text-[11px] ${isOn ? "text-paper/70" : "text-ink-mute"}`}
              >
                {t.width} px
              </div>
              <span
                aria-hidden
                className={`absolute right-3 top-3 inline-block h-2 w-2 rounded-full transition-colors ${
                  isOn ? "bg-signal" : "bg-ink/15 group-hover:bg-ink/30"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
