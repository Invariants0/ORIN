import { useState, useEffect, useCallback, useRef } from 'react';
import { PerformanceMetrics } from '@/lib/types/intelligence.types';

interface PerformanceGuardConfig {
  monitorInterval?: number; // ms
  renderThreshold?: number; // renders per second
  throttleThreshold?: number; // renders per second to trigger throttling
  enableAutoThrottle?: boolean;
}

export function usePerformanceGuard(
  componentName: string,
  config: PerformanceGuardConfig = {}
) {
  const {
    monitorInterval = 5000, // 5 seconds
    renderThreshold = 10,
    throttleThreshold = 20,
    enableAutoThrottle = true,
  } = config;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    timestamp: new Date(),
    componentRenders: {},
    renderDuration: {},
    heavyComponents: [],
    throttledUpdates: 0,
    droppedFrames: 0,
  });

  const [isThrottled, setIsThrottled] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef(Date.now());
  const throttleUntil = useRef(0);

  // Track render
  const trackRender = useCallback(() => {
    const now = Date.now();
    const duration = now - lastRenderTime.current;

    renderCount.current++;
    renderTimes.current.push(duration);

    // Keep last 100 renders
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    lastRenderTime.current = now;

    // Check if throttled
    if (now < throttleUntil.current) {
      setMetrics((prev) => ({
        ...prev,
        throttledUpdates: prev.throttledUpdates + 1,
      }));
    }
  }, []);

  // Calculate render frequency
  const calculateRenderFrequency = useCallback((): number => {
    if (renderTimes.current.length < 2) return 0;

    const recentRenders = renderTimes.current.slice(-10);
    const totalTime = recentRenders.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / recentRenders.length;

    return avgTime > 0 ? 1000 / avgTime : 0;
  }, []);

  // Check performance
  const checkPerformance = useCallback(() => {
    const frequency = calculateRenderFrequency();
    const avgDuration =
      renderTimes.current.length > 0
        ? renderTimes.current.reduce((sum, t) => sum + t, 0) /
          renderTimes.current.length
        : 0;

    const newWarnings: string[] = [];

    // Check render frequency
    if (frequency > renderThreshold) {
      newWarnings.push(
        `${componentName} is rendering ${frequency.toFixed(1)} times per second (threshold: ${renderThreshold})`
      );

      // Auto-throttle if enabled
      if (enableAutoThrottle && frequency > throttleThreshold) {
        const throttleDuration = 1000; // 1 second
        throttleUntil.current = Date.now() + throttleDuration;
        setIsThrottled(true);

        setTimeout(() => {
          setIsThrottled(false);
        }, throttleDuration);

        newWarnings.push(
          `Auto-throttling ${componentName} for ${throttleDuration}ms`
        );
      }
    }

    // Check render duration
    if (avgDuration > 16) {
      // 16ms = 60fps
      newWarnings.push(
        `${componentName} average render time is ${avgDuration.toFixed(1)}ms (target: <16ms for 60fps)`
      );
    }

    // Update metrics
    setMetrics((prev) => ({
      ...prev,
      timestamp: new Date(),
      componentRenders: {
        ...prev.componentRenders,
        [componentName]: renderCount.current,
      },
      renderDuration: {
        ...prev.renderDuration,
        [componentName]: [...renderTimes.current],
      },
      heavyComponents:
        frequency > renderThreshold
          ? [...new Set([...prev.heavyComponents, componentName])]
          : prev.heavyComponents.filter((c) => c !== componentName),
    }));

    setWarnings(newWarnings);

    // Log warnings
    if (newWarnings.length > 0) {
      console.warn('Performance warnings:', newWarnings);
    }
  }, [
    componentName,
    calculateRenderFrequency,
    renderThreshold,
    throttleThreshold,
    enableAutoThrottle,
  ]);

  // Track render on every render
  useEffect(() => {
    trackRender();
  });

  // Periodic performance check
  useEffect(() => {
    const interval = setInterval(checkPerformance, monitorInterval);
    return () => clearInterval(interval);
  }, [checkPerformance, monitorInterval]);

  // Measure specific operation
  const measureOperation = useCallback(
    async <T,>(name: string, operation: () => T | Promise<T>): Promise<T> => {
      const start = performance.now();

      try {
        const result = await operation();
        const duration = performance.now() - start;

        console.log(`[Performance] ${componentName}.${name}: ${duration.toFixed(2)}ms`);

        if (duration > 100) {
          console.warn(
            `[Performance] Slow operation: ${componentName}.${name} took ${duration.toFixed(2)}ms`
          );
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.error(
          `[Performance] ${componentName}.${name} failed after ${duration.toFixed(2)}ms`,
          error
        );
        throw error;
      }
    },
    [componentName]
  );

  // Get memory usage (if available)
  const getMemoryUsage = useCallback((): number | undefined => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return undefined;
  }, []);

  return {
    metrics,
    isThrottled,
    warnings,
    renderCount: renderCount.current,
    averageRenderTime:
      renderTimes.current.length > 0
        ? renderTimes.current.reduce((sum, t) => sum + t, 0) /
          renderTimes.current.length
        : 0,
    measureOperation,
    getMemoryUsage,
  };
}
