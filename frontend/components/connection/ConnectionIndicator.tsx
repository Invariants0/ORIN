'use client';

import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionIndicator() {
  const { connectionState, isConnected } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500',
          label: 'Connecting...',
          pulse: true,
        };
      case 'reconnecting':
        return {
          icon: Loader2,
          color: 'text-orange-500',
          label: 'Reconnecting...',
          pulse: true,
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          label: 'Disconnected',
          pulse: false,
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          label: 'Unknown',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
          <Icon
            className={cn(
              'h-4 w-4',
              config.color,
              config.pulse && 'animate-spin'
            )}
          />
          <span className="text-xs font-medium">{config.label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Real-time connection status</p>
      </TooltipContent>
    </Tooltip>
  );
}
