'use client';

import { Type as type, LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  trend?: 'up' | 'down';
}

export function AdminStatCard({ label, value, icon: Icon, change, trend }: AdminStatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {change}%
          </div>
        )}
      </div>
      <p className="text-foreground/60 text-sm font-medium mb-2">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
}
