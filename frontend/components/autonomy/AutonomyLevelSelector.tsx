'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Brain, Hand } from 'lucide-react';

type AutonomyLevel = 'manual' | 'assisted' | 'semi_auto' | 'auto';

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
    color: 'bg-gray-500',
    features: ['Full manual control', 'Suggestions only', 'No automatic actions']
  },
  {
    id: 'assisted' as AutonomyLevel,
    name: 'Assisted',
    icon: Shield,
    description: 'Suggestions with one-click approval',
    color: 'bg-blue-500',
    features: ['Smart suggestions', 'One-click approval', 'Safe automation']
  },
  {
    id: 'semi_auto' as AutonomyLevel,
    name: 'Semi-Auto',
    icon: Zap,
    description: 'Low-risk actions automated',
    color: 'bg-yellow-500',
    features: ['Auto-retry workflows', 'Auto-pause on errors', 'Human oversight']
  },
  {
    id: 'auto' as AutonomyLevel,
    name: 'Full Auto',
    icon: Brain,
    description: 'Full automation with oversight',
    color: 'bg-green-500',
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
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : 'hover:shadow-lg'
              }`}
              onClick={() => handleSelect(level.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${level.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{level.name}</CardTitle>
                <CardDescription>{level.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {level.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="mr-2">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
