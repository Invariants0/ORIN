import { useState, useEffect, useCallback } from 'react';
import { useWorkflows, useWorkflow } from '../queries/useWorkflowQueries';
import { patternDetector } from '@/lib/intelligence/pattern-detector';
import { suggestionEngine } from '@/lib/intelligence/suggestion-engine';
import { WorkflowPattern, Prediction, Suggestion } from '@/lib/types/intelligence.types';

export function usePredictiveAnalytics(workflowId?: string) {
  const { data: workflows = [] } = useWorkflows();
  const { data: currentWorkflow } = useWorkflow(workflowId || '');
  
  const [pattern, setPattern] = useState<WorkflowPattern | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze logic extracted to a helper or reactive effect
  const runAnalysis = useCallback((wf: any) => {
    if (!wf) return;
    setIsAnalyzing(true);
    try {
      if (wf.status === 'completed' || wf.status === 'failed') {
        patternDetector.recordRun(wf);
      }
      const detectedPattern = patternDetector.detectPatterns(wf.id);
      setPattern(detectedPattern);
      const generatedPrediction = patternDetector.predict(wf.id);
      setPrediction(generatedPrediction);
      const generatedSuggestions = suggestionEngine.generateSuggestions(wf, detectedPattern, generatedPrediction);
      setSuggestions(generatedSuggestions);
    } catch (e) {
      console.error('Analysis failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Update record of all workflows
  useEffect(() => {
    workflows.forEach(wf => {
      if (wf.status === 'completed' || wf.status === 'failed') {
        patternDetector.recordRun(wf);
      }
    });
  }, [workflows]);

  // Analyze specific workflow when it changes
  useEffect(() => {
    if (currentWorkflow) {
      runAnalysis(currentWorkflow);
    }
  }, [currentWorkflow, runAnalysis]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    suggestionEngine.dismissSuggestion(suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  return {
    pattern,
    prediction,
    suggestions,
    isAnalyzing,
    dismissSuggestion,
    refresh: () => runAnalysis(currentWorkflow),
  };
}
