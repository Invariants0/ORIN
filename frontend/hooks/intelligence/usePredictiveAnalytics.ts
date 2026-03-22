import { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '@/stores/workflow.store';
import { patternDetector } from '@/lib/intelligence/pattern-detector';
import { suggestionEngine } from '@/lib/intelligence/suggestion-engine';
import { WorkflowPattern, Prediction, Suggestion } from '@/lib/types/intelligence.types';

export function usePredictiveAnalytics(workflowId?: string) {
  const workflowStore = useWorkflowStore();
  
  const [pattern, setPattern] = useState<WorkflowPattern | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze a specific workflow
  const analyzeWorkflow = useCallback((id: string) => {
    setIsAnalyzing(true);

    try {
      const workflow = workflowStore.getWorkflow(id);
      if (!workflow) {
        setPattern(null);
        setPrediction(null);
        setSuggestions([]);
        return;
      }

      // Record the workflow run if completed or failed
      if (workflow.status === 'completed' || workflow.status === 'failed') {
        patternDetector.recordRun(workflow);
      }

      // Detect patterns
      const detectedPattern = patternDetector.detectPatterns(id);
      setPattern(detectedPattern);

      // Generate predictions
      const generatedPrediction = patternDetector.predict(id);
      setPrediction(generatedPrediction);

      // Generate suggestions
      const generatedSuggestions = suggestionEngine.generateSuggestions(
        workflow,
        detectedPattern,
        generatedPrediction
      );
      setSuggestions(generatedSuggestions);
    } catch (error) {
      console.error('Error analyzing workflow:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [workflowStore]);

  // Analyze all workflows
  const analyzeAll = useCallback(() => {
    const workflows = workflowStore.getAllWorkflows();
    
    workflows.forEach(workflow => {
      if (workflow.status === 'completed' || workflow.status === 'failed') {
        patternDetector.recordRun(workflow);
      }
    });
  }, [workflowStore]);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((suggestionId: string) => {
    suggestionEngine.dismissSuggestion(suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  // Refresh analysis
  const refresh = useCallback(() => {
    if (workflowId) {
      analyzeWorkflow(workflowId);
    } else {
      analyzeAll();
    }
  }, [workflowId, analyzeWorkflow, analyzeAll]);

  // Auto-analyze when workflow changes
  useEffect(() => {
    if (workflowId) {
      analyzeWorkflow(workflowId);
    }
  }, [workflowId, analyzeWorkflow]);

  // Periodic analysis
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [refresh]);

  return {
    pattern,
    prediction,
    suggestions,
    isAnalyzing,
    analyzeWorkflow,
    analyzeAll,
    dismissSuggestion,
    refresh,
  };
}
