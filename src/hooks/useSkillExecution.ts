import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SkillExecutionOptions {
  skillId: string;
  agentId?: string;
  inputData: Record<string, unknown>;
  queryContext?: {
    timeRange?: string;
    metricIds?: string[];
  };
}

interface UseSkillExecutionResult {
  isExecuting: boolean;
  output: string;
  executionId: string | null;
  error: string | null;
  execute: (options: SkillExecutionOptions) => Promise<void>;
  reset: () => void;
}

export function useSkillExecution(): UseSkillExecutionResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState('');
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setOutput('');
    setExecutionId(null);
    setError(null);
    setIsExecuting(false);
  }, []);

  const execute = useCallback(async (options: SkillExecutionOptions) => {
    reset();
    setIsExecuting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-skill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(options),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Get execution ID from header
      const execId = response.headers.get('X-Execution-Id');
      if (execId) {
        setExecutionId(execId);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullOutput += content;
              setOutput(fullOutput);
            }
          } catch {
            // Incomplete JSON, put back and wait
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Update execution record with final output
      if (execId) {
        await supabase
          .from('skill_executions')
          .update({
            status: 'completed',
            output_content: fullOutput,
            completed_at: new Date().toISOString(),
          })
          .eq('id', execId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Skill execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  }, [reset]);

  return {
    isExecuting,
    output,
    executionId,
    error,
    execute,
    reset,
  };
}
