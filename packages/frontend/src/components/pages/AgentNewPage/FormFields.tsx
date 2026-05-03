import { cn } from '@/lib/utils/styles';

interface FieldLabelProps {
  children: React.ReactNode;
}

export function FieldLabel({ children }: FieldLabelProps) {
  return (
    <label className="block font-mono text-sm font-medium uppercase tracking-widest text-text-tertiary">
      {children}
    </label>
  );
}

interface FieldInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function FieldInput({ value, onChange, placeholder, disabled, className }: FieldInputProps) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2',
        'font-mono text-base text-text-primary placeholder:text-text-muted',
        'focus:border-accent focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  );
}

interface FieldTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FieldTextarea({ value, onChange, placeholder, disabled }: FieldTextareaProps) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={8}
      className={cn(
        'w-full rounded-md border border-border-default bg-bg-secondary px-3 py-2',
        'font-mono text-base text-text-primary placeholder:text-text-muted',
        'focus:border-accent focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none'
      )}
    />
  );
}
