'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Activity, Shield, TrendingUp } from 'lucide-react';

interface Decision {
  id: string;
  action: string;
  confidence: number;
  riskLevel: string;
  reasoning: string;
  dataUsed: string[];
  expectedOutcome: string;
  status: string;
  createdAt: string;
}

interface DecisionLogViewerProps {
  decisions: Decision[];
  insights: {
    totalDataPoints: number;
    successRate: number;
    approvalRate: number;
    interventionRate: number;
    recommendations: string[];
  };
}

export function DecisionLogViewer({ decisions, insights }: DecisionLogViewerProps) {
  return (
    <Tabs defaultValue="logs" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="logs">Decision Logs</TabsTrigger>
        <TabsTrigger value="insights">Learning Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="logs" className="space-y-4">
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {decisions.map((decision) => (
              <Card key={decision.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        {decision.action}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(decision.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge>{decision.confidence}%</Badge>
                      <Badge variant="outline">{decision.riskLevel}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Reasoning:</p>
                    <p className="text-sm text-muted-foreground">{decision.reasoning}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Expected Outcome:</p>
                    <p className="text-sm text-muted-foreground">{decision.expectedOutcome}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Data Sources:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {decision.dataUsed.map((data, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {data}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="insights" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(insights.successRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {insights.totalDataPoints} decisions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(insights.approvalRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                User approval of decisions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Intervention Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(insights.interventionRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                User manual interventions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {insights.totalDataPoints}
              </div>
              <p className="text-xs text-muted-foreground">
                Autonomous decisions made
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              AI-generated suggestions based on learning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <TrendingUp className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recommendations yet. Keep using the system to generate insights.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
