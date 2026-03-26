'use client';

import { useHealthMonitor } from '@/hooks/intelligence/useHealthMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/core/ui/card';
import { Button } from '@/components/core/ui/button';
import { Badge } from '@/components/core/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw, Activity } from 'lucide-react';

export function HealthDashboard() {
  const { health, isHealthy, isHealing, heal, checkNow } = useHealthMonitor();

  const getIssueCount = () => {
    return Object.values(health.issues).reduce((sum, arr) => sum + arr.length, 0);
  };

  const issueCount = getIssueCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>
              Last checked: {health.timestamp.toLocaleTimeString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Healthy
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {issueCount} Issue{issueCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Workflows</p>
            <p className="text-2xl font-bold">{health.metrics.totalWorkflows}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Healthy</p>
            <p className="text-2xl font-bold text-green-500">
              {health.metrics.healthyWorkflows}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Issues</p>
            <p className="text-2xl font-bold text-yellow-500">
              {health.metrics.issueCount}
            </p>
          </div>
        </div>

        {/* Issues */}
        {!isHealthy && (
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Detected Issues</p>
            
            {health.issues.staleWorkflows.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-500">
                  Stale Workflows ({health.issues.staleWorkflows.length})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  No updates received in 5+ minutes
                </p>
              </div>
            )}

            {health.issues.orphanedOptimistic.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-500">
                  Orphaned Optimistic Updates ({health.issues.orphanedOptimistic.length})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Optimistic updates not confirmed after 30s
                </p>
              </div>
            )}

            {health.issues.inconsistentStates.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-500">
                  Inconsistent States ({health.issues.inconsistentStates.length})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Divergence between local and server state
                </p>
              </div>
            )}

            {health.issues.versionConflicts.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-500">
                  Version Conflicts ({health.issues.versionConflicts.length})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Event version mismatches detected
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={checkNow}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check Now
          </Button>
          {!isHealthy && (
            <Button
              size="sm"
              onClick={heal}
              disabled={isHealing}
              className="flex-1"
            >
              {isHealing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Healing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Auto-Heal
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
