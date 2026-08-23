export function Toggle({
  name,
  label,
  description,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {description && <span className="block text-xs text-ink-400">{description}</span>}
      </span>
      <span className="relative inline-block h-6 w-11 shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-ink-400/25 transition-colors peer-checked:bg-board-700" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-washi-100 shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
