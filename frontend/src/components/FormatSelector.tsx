import { FORMATS, type OutputFormat } from "../lib/transforms";

interface Props {
  value: OutputFormat;
  onChange: (next: OutputFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({ value, onChange, disabled }: Props) {
  return (
    <div>
      <div className="mb-2 text-sm text-ink-soft">Output format</div>
      <div
        role="radiogroup"
        aria-label="Output format"
        className="inline-flex overflow-hidden rounded-md border border-ink/20"
      >
        {FORMATS.map((fmt) => {
          const isOn = value === fmt;
          return (
            <button
              key={fmt}
              role="radio"
              aria-checked={isOn}
              type="button"
              disabled={disabled}
              onClick={() => onChange(fmt)}
              className={`px-4 py-2 font-mono text-xs transition-colors first:border-l-0 ${
                isOn
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink-soft hover:bg-paper-deep/60"
              } ${disabled ? "opacity-60" : ""} border-l border-ink/15`}
            >
              {fmt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
