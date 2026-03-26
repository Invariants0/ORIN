'use client';

import { useState } from 'react';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandBadge as Badge } from '@/components/core/brand/Badge';
import { Shield, Zap, Brain, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AutonomyLevel = 'manual' | 'assisted' | 'semi_auto' | 'auto';

interface AutonomyLevelSelectorProps {
  currentLevel: AutonomyLevel;
  onLevelChange: (level: AutonomyLevel) => void;
}

const levels = [
  {
    id: 'manual' as AutonomyLevel,
    name: 'Manual',
    icon: Hand,
    description: 'No automation - you control everything',
    color: 'bg-neutral-400',
    variant: 'white' as const,
    features: ['Full manual control', 'Suggestions only', 'No automatic actions']
  },
  {
    id: 'assisted' as AutonomyLevel,
    name: 'Assisted',
    icon: Shield,
    description: 'Suggestions with one-click approval',
    color: 'bg-[#ffe17c]',
    variant: 'yellow' as const,
    features: ['Smart suggestions', 'One-click approval', 'Safe automation']
  },
  {
    id: 'semi_auto' as AutonomyLevel,
    name: 'Semi-Auto',
    icon: Zap,
    description: 'Low-risk actions automated',
    color: 'bg-[#b7c6c2]',
    variant: 'sage' as const,
    features: ['Auto-retry workflows', 'Auto-pause on errors', 'Human oversight']
  },
  {
    id: 'auto' as AutonomyLevel,
    name: 'Full Auto',
    icon: Brain,
    description: 'Full automation with oversight',
    color: 'bg-black',
    variant: 'charcoal' as const,
    features: ['Complete automation', 'Self-healing', 'Continuous optimization']
  }
];

export function AutonomyLevelSelector({ currentLevel, onLevelChange }: AutonomyLevelSelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<AutonomyLevel>(currentLevel);

  const handleSelect = (level: AutonomyLevel) => {
    setSelectedLevel(level);
    onLevelChange(level);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((level) => {
          const Icon = level.icon;
          const isSelected = selectedLevel === level.id;

          return (
            <Card
              key={level.id}
              variant={isSelected ? level.variant : 'white'}
              className={cn(
                "cursor-pointer p-6 transition-all border-2",
                isSelected ? "border-black shadow-[6px_6px_0px_0px_#000]" : "border-black/10 hover:border-black/30 shadow-none"
              )}
              onClick={() => handleSelect(level.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "w-10 h-10 border-2 border-black flex items-center justify-center",
                  isSelected ? "bg-white text-black" : "bg-neutral-100 text-black/40"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                {isSelected && (
                  <Badge variant="black">ACTIVE</Badge>
                )}
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tighter mb-1">{level.name}</h3>
              <p className={cn("text-xs font-bold leading-relaxed mb-4", isSelected ? "text-black/60" : "text-black/40")}>
                {level.description}
              </p>

              <ul className="space-y-2">
                {level.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-[10px] font-black uppercase tracking-widest gap-2">
                    <span className={cn("w-1 h-1 rounded-full", isSelected ? "bg-black" : "bg-black/20")} />
                    <span className={isSelected ? "text-black" : "text-black/40"}>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
