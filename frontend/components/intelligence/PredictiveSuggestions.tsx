'use client';

import { usePredictiveAnalytics } from '@/hooks/intelligence/usePredictiveAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lightbulb, TrendingUp, X, Zap } from 'lucide-react';

interface PredictiveSuggestionsProps {
  workflowId?: string;
}

export function PredictiveSuggestions({ workflowId }: PredictiveSuggestionsProps) {
  const { pattern, prediction, suggestions, isAnalyzing, dismissSuggestion } =
    usePredictiveAnalytics(workflowId);

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pattern && !prediction && suggestions.length === 0) {
    return null;
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <Zap className="h-4 w-4" />;
      case 'optimization':
        return <TrendingUp className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'automation':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'action':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'optimization':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'automation':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Prediction Card */}
      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prediction</CardTitle>
            <CardDescription>
              Based on {pattern?.statistics.totalRuns || 0} historical runs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Failure Probability</span>
              <Badge variant={prediction.likelyToFail > 0.7 ? 'destructive' : 'secondary'}>
                {(prediction.likelyToFail * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estimated Duration</span>
              <span className="text-sm font-medium">
                {(prediction.estimatedDuration / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <Badge variant="outline">
                {(prediction.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
            {prediction.reasoning.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Reasoning:</p>
                <ul className="space-y-1">
                  {prediction.reasoning.map((reason, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start">
                      <span className="mr-2">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Intelligent Suggestions</CardTitle>
            <CardDescription>
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-3 rounded-lg border ${getSuggestionColor(suggestion.type)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 space-y-2">
                      <p className="text-sm">{suggestion.message}</p>
                      {suggestion.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={suggestion.action.handler}
                          className="h-7"
                        >
                          {suggestion.action.label}
                        </Button>
                      )}
                    </div>
                  </div>
                  {suggestion.dismissible && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => dismissSuggestion(suggestion.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    Priority: {suggestion.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
