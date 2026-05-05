import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  SkillFrontmatter,
  SkillBody,
  SkillRow,
  SkillPipeline,
  transformRowToFrontmatter,
  transformRowToBody,
  transformSkillRow,
  LegacySkillDefinition,
} from '@/types/skill';

// Lightweight frontmatter columns — only these are fetched on init
const FRONTMATTER_COLUMNS = [
  'id', 'name', 'display_name', 'description', 'category', 'icon',
  'source_type', 'trigger_phrases', 'input_spec', 'output_spec',
  'version', 'is_active', 'created_at', 'updated_at',
  // Legacy columns needed for backward-compat transform
  'purpose', 'input_requirements', 'hard_rules', 'section_logic',
  'confidence_scoring', 'output_template',
].join(', ');

interface SkillsContextType {
  // New progressive-disclosure API
  skills: SkillFrontmatter[];
  isLoading: boolean;
  error: string | null;
  getSkillById: (id: string) => SkillFrontmatter | undefined;
  getSkillByName: (name: string) => SkillFrontmatter | undefined;
  getSkillsByCategory: (category: string) => SkillFrontmatter[];
  searchSkills: (phrase: string) => SkillFrontmatter[];
  getSkillBody: (id: string) => Promise<SkillBody | null>;
  getPipelines: () => Promise<SkillPipeline[]>;
  refetch: () => Promise<void>;

  // Legacy backward-compat API (for components not yet migrated)
  legacySkills: LegacySkillDefinition[];
}

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

// Cache for lazy-loaded skill bodies
const bodyCache = new Map<string, SkillBody>();

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = useState<SkillFrontmatter[]>([]);
  const [legacySkills, setLegacySkills] = useState<LegacySkillDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('agent_skills')
        .select(FRONTMATTER_COLUMNS)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = data as unknown as SkillRow[];
      setSkills(rows.map(transformRowToFrontmatter));
      setLegacySkills(rows.map(transformSkillRow));

      // Clear body cache on refetch (versions may have changed)
      bodyCache.clear();
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Defer Supabase fetch to after initial paint
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => fetchSkills());
    } else {
      setTimeout(fetchSkills, 150);
    }
  }, [fetchSkills]);

  const getSkillById = useCallback(
    (id: string) => skills.find((s) => s.id === id),
    [skills]
  );

  const getSkillByName = useCallback(
    (name: string) => skills.find((s) => s.name === name),
    [skills]
  );

  const getSkillsByCategory = useCallback(
    (category: string) => skills.filter((s) => s.category === category),
    [skills]
  );

  /** Search skills by matching against trigger phrases and description */
  const searchSkills = useCallback(
    (phrase: string) => {
      const lower = phrase.toLowerCase();
      return skills.filter(
        (s) =>
          s.triggerPhrases.some((tp) => tp.toLowerCase().includes(lower)) ||
          s.description.toLowerCase().includes(lower) ||
          s.displayName.toLowerCase().includes(lower)
      );
    },
    [skills]
  );

  /** Lazy-load full skill body (Level 2 progressive disclosure) */
  const getSkillBody = useCallback(async (id: string): Promise<SkillBody | null> => {
    // Check cache first
    const cached = bodyCache.get(id);
    if (cached) return cached;

    try {
      const { data, error: fetchError } = await supabase
        .from('agent_skills')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !data) return null;

      const body = transformRowToBody(data as unknown as SkillRow);
      bodyCache.set(id, body);
      return body;
    } catch (err) {
      console.error('Error fetching skill body:', err);
      return null;
    }
  }, []);

  /** Fetch skill pipelines */
  const getPipelines = useCallback(async (): Promise<SkillPipeline[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('skill_pipelines')
        .select('*')
        .eq('is_active', true);

      if (fetchError || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        steps: Array.isArray(row.steps) ? row.steps : [],
      }));
    } catch {
      return [];
    }
  }, []);

  return (
    <SkillsContext.Provider
      value={{
        skills,
        isLoading,
        error,
        getSkillById,
        getSkillByName,
        getSkillsByCategory,
        searchSkills,
        getSkillBody,
        getPipelines,
        refetch: fetchSkills,
        legacySkills,
      }}
    >
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills() {
  const context = useContext(SkillsContext);
  if (!context) {
    throw new Error('useSkills must be used within a SkillsProvider');
  }
  return context;
}

// Re-export for backward compatibility
export type { SkillFrontmatter, LegacySkillDefinition as SkillDefinition };
