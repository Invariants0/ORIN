'use client';

import { 
  WifiOff, 
  RotateCw, 
  Zap, 
  AlertCircle 
} from 'lucide-react';
import { useWebSocketContext } from '@/providers/websocket-provider';
import { cn } from '@/lib/utils';
import { BrandBadge as Badge } from '@/components/core/brand/Badge';

export function ConnectionIndicator() {
  const { connectionState, isConnected } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Zap,
          color: 'text-black',
          badgeVariant: 'sage' as const,
          label: 'ONLINE',
          pulse: false,
          labelColor: 'text-black'
        };
      case 'connecting':
        return {
          icon: RotateCw,
          color: 'text-black',
          badgeVariant: 'yellow' as const,
          label: 'SYNCING',
          pulse: true,
          labelColor: 'text-black'
        };
      case 'reconnecting':
        return {
          icon: RotateCw,
          color: 'text-black',
          badgeVariant: 'yellow' as const,
          label: 'RECOVERING',
          pulse: true,
          labelColor: 'text-black'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-white',
          badgeVariant: 'black' as const,
          label: 'OFFLINE',
          pulse: false,
          labelColor: 'text-black/40'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-black/40',
          badgeVariant: 'white' as const,
          label: 'UNKNOWN',
          pulse: false,
          labelColor: 'text-black/20'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 border-2 border-black rounded-xl bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-default",
        connectionState === 'disconnected' && "opacity-80 bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]"
      )}>
        {/* Status Icon Container */}
        <div className={cn(
          "w-6 h-6 border-2 border-black flex items-center justify-center bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]",
          config.pulse && "animate-pulse"
        )}>
          <Icon className={cn(
            "h-3 w-3",
            config.color,
            (connectionState === 'connecting' || connectionState === 'reconnecting') && "animate-spin"
          )} />
        </div>
        
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Badge 
              variant={config.badgeVariant} 
              className="text-[8px] font-black px-1.5 py-0 rounded-none border-[1.5px]"
            >
              {config.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full border border-black",
              isConnected 
                ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" 
                : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            )} />
            <span className={cn(
              "text-[7px] font-black uppercase tracking-tighter whitespace-nowrap leading-none",
              isConnected ? "text-green-600" : "text-black/40"
            )}>
              {isConnected ? "ACTIVE_CHANNEL" : "SIGNAL_LOST"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
