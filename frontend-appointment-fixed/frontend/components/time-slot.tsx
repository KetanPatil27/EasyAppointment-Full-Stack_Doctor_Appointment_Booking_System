'use client';

import { Clock } from 'lucide-react';

interface TimeSlotProps {
  time: string;
  available: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function TimeSlot({
  time,
  available,
  selected = false,
  onSelect,
}: TimeSlotProps) {
  return (
    <button
      onClick={onSelect}
      disabled={!available}
      className={`
        flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
        ${
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : available
            ? 'border-border bg-background hover:border-primary hover:bg-primary/5'
            : 'border-border bg-muted text-foreground/50 cursor-not-allowed opacity-50'
        }
      `}
    >
      <Clock className="h-4 w-4 mb-1" />
      <span className="text-sm font-semibold">{time}</span>
    </button>
  );
}
