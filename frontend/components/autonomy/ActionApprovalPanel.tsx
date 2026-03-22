'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Info, Undo2 } from 'lucide-react';

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

const riskColors = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const statusColors = {
  pending: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  executed: 'bg-purple-500'
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
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Pending Approval ({pendingActions.length})
          </h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {pendingActions.map((action) => (
                <Card key={action.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{action.action}</CardTitle>
                        <CardDescription className="mt-1">
                          {action.reasoning}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={riskColors[action.riskLevel]}>
                          {action.riskLevel}
                        </Badge>
                        <Badge variant="outline">
                          {action.confidence}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Expected Outcome */}
                      <div>
                        <p className="text-sm font-medium mb-1">Expected Outcome:</p>
                        <p className="text-sm text-muted-foreground">{action.expectedOutcome}</p>
                      </div>

                      {/* Data Used */}
                      {expandedId === action.id && (
                        <div>
                          <p className="text-sm font-medium mb-1">Data Used:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {action.dataUsed.map((data, idx) => (
                              <li key={idx} className="flex items-center">
                                <Info className="h-3 w-3 mr-2" />
                                {data}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onApprove(action.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(action.id)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                        >
                          {expandedId === action.id ? 'Less' : 'More'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Recent Executed Actions */}
      {executedActions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Actions</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {executedActions.slice(0, 10).map((action) => (
                <Card key={action.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{action.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.reasoning}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[action.status]}>
                          {action.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onUndo(action.id)}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {actions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Info className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No autonomous actions yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
