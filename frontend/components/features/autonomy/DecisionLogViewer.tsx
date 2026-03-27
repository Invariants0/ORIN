'use client';

import { Card } from '@/components/core/brand/Card';
import { ScrollArea } from '@/components/core/ui/scroll-area';
import { BrandBadge as Badge } from '@/components/core/brand/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/core/ui/tabs';
import { Brain, Activity, Shield, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

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
      <TabsList className="grid w-full grid-cols-2 bg-neutral-100 border-2 border-black p-1 h-auto mb-6">
        <TabsTrigger 
          value="logs" 
          className="py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white transition-all"
        >
          Decision Logs
        </TabsTrigger>
        <TabsTrigger 
          value="insights" 
          className="py-2.5 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-black data-[state=active]:text-white transition-all"
        >
          Learning Insights
        </TabsTrigger>
      </TabsList>

      <TabsContent value="logs" className="space-y-4 m-0 overflow-visible">
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {decisions.map((decision) => (
              <Card key={decision.id} className="p-5 border-2 border-black">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       {decision.status === 'executed' ? (
                         <CheckCircle className="w-4 h-4 text-green-600" />
                       ) : (
                         <XCircle className="w-4 h-4 text-red-600" />
                       )}
                       <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                         {new Date(decision.createdAt).toLocaleString()}
                       </span>
                    </div>
                    <h4 className="text-base font-black uppercase tracking-tight leading-tight">
                      {decision.action}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="yellow" className="text-[9px]">{decision.confidence}% CONFIDENCE</Badge>
                    <Badge variant="white" className="text-[9px] border-black/20">{decision.riskLevel.toUpperCase()}</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-neutral-50 p-3 border border-black/5 rounded-lg">
                    <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">Reasoning</p>
                    <p className="text-xs font-bold text-black/70 leading-relaxed italic">"{decision.reasoning}"</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">Impact</p>
                      <p className="text-xs font-bold leading-relaxed">{decision.expectedOutcome}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">Integrations</p>
                      <div className="flex flex-wrap gap-1">
                        {decision.dataUsed.map((data, idx) => (
                          <span key={idx} className="bg-white border border-black/10 text-[8px] font-black uppercase px-1.5 py-0.5">
                            {data}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="insights" className="space-y-6 m-0">
        <div className="grid grid-cols-2 gap-4">
          <Card variant="yellow" className="p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-4 w-4 text-black" />
              <span className="text-[9px] font-black uppercase tracking-widest">Accuracy</span>
            </div>
            <div className="text-2xl font-black">{(insights.successRate * 100).toFixed(1)}%</div>
            <p className="text-[9px] font-bold text-black/40 uppercase mt-1">Based on {insights.totalDataPoints} actions</p>
          </Card>

          <Card variant="sage" className="p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-4 w-4 text-black" />
              <span className="text-[9px] font-black uppercase tracking-widest">Alignment</span>
            </div>
            <div className="text-2xl font-black">{(insights.approvalRate * 100).toFixed(1)}%</div>
            <p className="text-[9px] font-bold text-black/40 uppercase mt-1">User trust factor</p>
          </Card>

          <Card className="p-4 border-2 border-black">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-black" />
              <span className="text-[9px] font-black uppercase tracking-widest">Manual Bias</span>
            </div>
            <div className="text-2xl font-black">{(insights.interventionRate * 100).toFixed(1)}%</div>
            <p className="text-[9px] font-bold text-black/40 uppercase mt-1">Correction frequency</p>
          </Card>

          <Card className="p-4 border-2 border-black">
            <div className="flex items-center justify-between mb-2">
              <Brain className="h-4 w-4 text-black" />
              <span className="text-[9px] font-black uppercase tracking-widest">Velocity</span>
            </div>
            <div className="text-2xl font-black">{insights.totalDataPoints}</div>
            <p className="text-[9px] font-bold text-black/40 uppercase mt-1">Total decisions</p>
          </Card>
        </div>

        <Card className="p-6 border-2 border-black bg-[#171e19]">
          <div className="flex items-center gap-2 mb-4 text-[#ffe17c]">
            <TrendingUp className="h-5 w-5" />
            <h4 className="text-sm font-black uppercase tracking-widest">Orin Recommendations</h4>
          </div>
          <div className="space-y-3">
            {insights.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                <span className="w-1.5 h-1.5 bg-[#ffe17c] rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-xs font-bold text-white/80 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
