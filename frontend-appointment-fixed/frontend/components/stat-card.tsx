import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  description?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  description,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-foreground/60 font-medium">{label}</p>
          <p className="text-3xl font-bold text-primary mt-1">{value}</p>
          {description && (
            <p className="text-xs text-foreground/50 mt-2">{description}</p>
          )}
        </div>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
