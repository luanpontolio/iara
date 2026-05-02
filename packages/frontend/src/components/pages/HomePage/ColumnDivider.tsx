'use client';

import { Text } from '@/components/atoms';
import { useHover } from '@/hooks';
import { cn } from '@/lib/utils/styles';

export function ColumnDivider({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { isHovered, hoverProps } = useHover();
  const lit = active || isHovered;

  return (
    <div onClick={onClick} {...hoverProps} className="flex cursor-pointer select-none flex-col items-center">
      <div className="flex h-14 items-center">
        <Text
          variant="label"
          color={lit ? 'primary' : 'muted'}
          className={cn('text-[10px] tracking-[0.08em] transition-colors duration-150')}
        >
          {label}
        </Text>
      </div>
      <div
        className={cn('w-px flex-1 transition-colors duration-150', lit ? 'bg-border-default' : 'bg-border-subtle')}
      />
    </div>
  );
}
