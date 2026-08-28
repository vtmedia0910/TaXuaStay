export function CheckboxField({
  name,
  label,
  defaultChecked = false,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl bg-pine-soft px-4 py-3 text-sm text-pine">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-pine"
      />
      <span>
        <span className="font-bold">{label}</span>
        {hint ? <span className="mt-1 block leading-5 text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
