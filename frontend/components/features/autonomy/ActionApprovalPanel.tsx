'use client';

import { useState } from 'react';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandBadge as Badge } from '@/components/core/brand/Badge';
import { ScrollArea } from '@/components/core/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Undo2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Action {
  id: string;
  action: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  expectedOutcome: string;
  dataUsed: string[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: string;
}

interface ActionApprovalPanelProps {
  actions: Action[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onUndo: (id: string) => void;
}

const riskVariants = {
  low: 'sage' as const,
  medium: 'yellow' as const,
  high: 'black' as const,
  critical: 'black' as const // Custom styling needed for critical in real app
};

export function ActionApprovalPanel({ 
  actions, 
  onApprove, 
  onReject, 
  onUndo 
}: ActionApprovalPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingActions = actions.filter(a => a.status === 'pending');
  const executedActions = actions.filter(a => a.status === 'executed');

  return (
    <div className="space-y-6">
      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#ffe17c]" />
            <h3 className="text-sm font-black uppercase tracking-widest">
              Awaiting Approval ({pendingActions.length})
            </h3>
          </div>
          
          <div className="space-y-3">
            {pendingActions.map((action) => (
              <Card key={action.id} className="p-0 overflow-hidden border-2 border-black">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={riskVariants[action.riskLevel]}>{action.riskLevel.toUpperCase()}</Badge>
                        <span className="text-[10px] font-mono text-black/40">{action.confidence}% confidence</span>
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-tight leading-tight mb-2">
                        {action.action}
                      </h4>
                      <p className="text-xs font-bold text-black/60 italic">
                        "{action.reasoning}"
                      </p>
                    </div>
                  </div>

                  {expandedId === action.id && (
                    <div className="mt-4 pt-4 border-t border-black/5 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Expected Outcome</p>
                        <p className="text-xs font-bold">{action.expectedOutcome}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Data Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {action.dataUsed.map((data, idx) => (
                            <span key={idx} className="bg-neutral-100 text-[10px] font-mono font-bold px-2 py-0.5 border border-black/10">
                              {data}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onApprove(action.id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReject(action.id)}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                      className="px-2"
                    >
                      {expandedId === action.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Executed Actions */}
      {executedActions.length > 0 && (
        <div className="space-y-4 pt-4 border-t-2 border-dashed border-black/10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-black/40">Recently Executed</h3>
          <div className="space-y-2">
            {executedActions.slice(0, 5).map((action) => (
              <div 
                key={action.id} 
                className="flex items-center justify-between p-3 bg-neutral-50/50 border border-black/5 rounded-xl group hover:border-black/20 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase truncate">{action.action}</p>
                  <p className="text-[10px] font-bold text-black/40">Executed · {new Date(action.createdAt).toLocaleTimeString()}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onUndo(action.id)}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {actions.length === 0 && (
        <div className="p-12 text-center opacity-20">
          <Info className="h-10 w-10 mx-auto mb-3" />
          <p className="text-xs font-black uppercase tracking-widest">No autonomous data</p>
        </div>
      )}
    </div>
  );
}
