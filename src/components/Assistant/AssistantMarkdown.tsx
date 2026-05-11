import { Children, Fragment, useMemo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetrics } from '@/contexts/MetricsContext';
import { useSpecialists } from '@/contexts/SpecialistsContext';

type EntityType = 'metric' | 'specialist';

function renderMentions(
  text: string,
  entityLookup: Map<string, EntityType>,
  sortedNames: string[],
  keyPrefix: string,
): ReactNode {
  if (!text || sortedNames.length === 0) return text;

  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const atIdx = remaining.indexOf('@');
    if (atIdx === -1) {
      parts.push(remaining);
      break;
    }

    if (atIdx > 0) parts.push(remaining.slice(0, atIdx));
    const afterAt = remaining.slice(atIdx + 1);

    let matched = false;
    for (const name of sortedNames) {
      if (afterAt.toLowerCase().startsWith(name)) {
        const charAfter = afterAt[name.length];
        if (charAfter === undefined || /[\s@.,!?;:\n]/.test(charAfter)) {
          const mentionName = afterAt.slice(0, name.length);
          const type = entityLookup.get(name)!;
          const Icon = type === 'metric' ? BarChart3 : Users;
          const colorClass =
            type === 'metric'
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';

          parts.push(
            <span
              key={`${keyPrefix}-${key++}`}
              className={cn(
                'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium',
                colorClass,
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{mentionName}</span>
            </span>,
          );
          remaining = afterAt.slice(name.length);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      parts.push('@');
      remaining = afterAt;
    }
  }

  return parts.length > 0 ? <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</> : text;
}

function walkChildrenWithMentions(
  children: ReactNode,
  entityLookup: Map<string, EntityType>,
  sortedNames: string[],
  keyPrefix: string,
): ReactNode {
  return Children.map(children, (child, idx) => {
    if (typeof child === 'string') {
      return renderMentions(child, entityLookup, sortedNames, `${keyPrefix}-${idx}`);
    }
    return child;
  });
}

interface AssistantMarkdownProps {
  children: string;
}

export function AssistantMarkdown({ children }: AssistantMarkdownProps) {
  const { metrics } = useMetrics();
  const { specialists } = useSpecialists();

  const entityLookup = useMemo(() => {
    const map = new Map<string, EntityType>();
    metrics.forEach((m) => map.set(m.name.toLowerCase(), 'metric'));
    specialists.forEach((s) => map.set(s.name.toLowerCase(), 'specialist'));
    return map;
  }, [metrics, specialists]);

  const sortedNames = useMemo(
    () => Array.from(entityLookup.keys()).sort((a, b) => b.length - a.length),
    [entityLookup],
  );

  const components = useMemo(() => {
    const withMentions = (key: string) => (props: { children?: ReactNode }) =>
      walkChildrenWithMentions(props.children, entityLookup, sortedNames, key);

    return {
      h1: ({ children: c }: { children?: ReactNode }) => (
        <h1 className="text-base font-bold mt-3 mb-1.5 first:mt-0 text-foreground">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'h1')}
        </h1>
      ),
      h2: ({ children: c }: { children?: ReactNode }) => (
        <h2 className="text-sm font-semibold mt-3 mb-1.5 first:mt-0 text-foreground">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'h2')}
        </h2>
      ),
      h3: ({ children: c }: { children?: ReactNode }) => (
        <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0 text-foreground">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'h3')}
        </h3>
      ),
      p: ({ children: c }: { children?: ReactNode }) => (
        <p className="text-sm text-foreground leading-relaxed my-2 first:mt-0 last:mb-0">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'p')}
        </p>
      ),
      strong: ({ children: c }: { children?: ReactNode }) => (
        <strong className="font-semibold text-foreground">{c}</strong>
      ),
      em: ({ children: c }: { children?: ReactNode }) => (
        <em className="text-foreground/90">{c}</em>
      ),
      ul: ({ children: c }: { children?: ReactNode }) => (
        <ul className="my-2 space-y-1 list-disc list-outside pl-5">{c}</ul>
      ),
      ol: ({ children: c }: { children?: ReactNode }) => (
        <ol className="my-2 space-y-1 list-decimal list-outside pl-5">{c}</ol>
      ),
      li: ({ children: c }: { children?: ReactNode }) => (
        <li className="text-sm text-foreground leading-relaxed">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'li')}
        </li>
      ),
      blockquote: ({ children: c }: { children?: ReactNode }) => (
        <blockquote className="border-l-2 border-primary/40 pl-3 my-3 text-muted-foreground/90 italic">
          {c}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-border/50" />,
      table: ({ children: c }: { children?: ReactNode }) => (
        <div className="overflow-x-auto my-3 rounded-md border border-border">
          <table className="w-full border-collapse text-sm">{c}</table>
        </div>
      ),
      thead: ({ children: c }: { children?: ReactNode }) => (
        <thead className="bg-muted/50">{c}</thead>
      ),
      tbody: ({ children: c }: { children?: ReactNode }) => <tbody>{c}</tbody>,
      tr: ({ children: c }: { children?: ReactNode }) => (
        <tr className="border-b border-border/40 last:border-b-0">{c}</tr>
      ),
      th: ({ children: c }: { children?: ReactNode }) => (
        <th className="px-3 py-2 text-left font-medium text-foreground text-xs border-b border-border whitespace-nowrap">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'th')}
        </th>
      ),
      td: ({ children: c }: { children?: ReactNode }) => (
        <td className="px-3 py-2 text-foreground text-sm border-b border-border/40 align-top">
          {walkChildrenWithMentions(c, entityLookup, sortedNames, 'td')}
        </td>
      ),
      code: ({ children: c, className }: { children?: ReactNode; className?: string }) => {
        if (className?.startsWith('language-')) {
          return (
            <pre className="bg-muted rounded-md p-3 overflow-x-auto my-3">
              <code className="text-xs">{c}</code>
            </pre>
          );
        }
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{c}</code>
        );
      },
      a: ({ children: c, href }: { children?: ReactNode; href?: string }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2 hover:opacity-80"
        >
          {c}
        </a>
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityLookup, sortedNames]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
