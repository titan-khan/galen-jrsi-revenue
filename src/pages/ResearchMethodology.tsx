import { Link } from 'react-router-dom';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  METHODOLOGY_SECTIONS,
  GLOSSARY,
  type MethodologySection,
} from '@/data/methodologyData';

const BAND_TONE: Record<'muted' | 'amber' | 'destructive', string> = {
  muted: 'border-border bg-muted/40 text-muted-foreground',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-700',
  destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
};

function Section({ section }: { section: MethodologySection }) {
  return (
    <Card id={section.anchor} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{section.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{section.summary}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {section.body.map((block, i) => {
          if (block.kind === 'p') {
            return (
              <p key={i} className="text-sm leading-relaxed text-foreground/85">
                {block.text}
              </p>
            );
          }
          if (block.kind === 'code') {
            return (
              <pre
                key={i}
                className="overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground"
              >
                {block.text}
              </pre>
            );
          }
          if (block.kind === 'kv') {
            return (
              <dl key={i} className="grid grid-cols-[160px_1fr] gap-x-3 gap-y-1.5 text-sm">
                {block.rows!.map((r) => (
                  <div key={r.k} className="contents">
                    <dt className="font-mono text-[12px] text-muted-foreground">{r.k}</dt>
                    <dd className="text-foreground/85">{r.v}</dd>
                  </div>
                ))}
              </dl>
            );
          }
          if (block.kind === 'band') {
            return (
              <div key={i} className="space-y-1.5">
                {block.bands!.map((b) => (
                  <div
                    key={b.range}
                    className={cn(
                      'flex items-center gap-3 rounded-md border px-3 py-2 text-sm',
                      BAND_TONE[b.tone],
                    )}
                  >
                    <span className="font-mono text-[12px] font-semibold">{b.range}</span>
                    <span className="text-foreground/85">{b.label}</span>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </CardContent>
    </Card>
  );
}

const ResearchMethodology = () => {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Research
            </Link>
          </Button>
        </div>

        <header className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Metodologi
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Metodologi & Glosarium</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bagaimana setiap skor dihitung, bagaimana sumber dinilai, dan istilah teknis apa yang
            kami pakai. Halaman ini adalah referensi untuk analis, internal audit, dan reviewer
            OJK.
          </p>
        </header>

        {/* TOC */}
        <Card className="bg-muted/40">
          <CardContent className="flex flex-wrap gap-2 p-4">
            {METHODOLOGY_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.anchor}`}
                className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:border-primary/50 hover:text-primary"
              >
                {s.title}
              </a>
            ))}
            <a
              href="#glosarium"
              className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:border-primary/50 hover:text-primary"
            >
              Glosarium
            </a>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          {METHODOLOGY_SECTIONS.map((s) => (
            <Section key={s.id} section={s} />
          ))}
        </div>

        {/* Glossary */}
        <Card id="glosarium" className="scroll-mt-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Glosarium</CardTitle>
            <p className="text-sm text-muted-foreground">
              Istilah teknis ↔ Bahasa Indonesia. Identifier (`coupling_signature`, `binding`)
              tetap dipakai dalam log sistem, padanan Bahasa dipakai di UI.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {GLOSSARY.map((g) => (
              <div
                key={g.term}
                className="grid grid-cols-[180px_180px_1fr] gap-3 rounded-md border border-border bg-background px-3 py-2"
              >
                <span className="font-mono text-[12px] text-muted-foreground">{g.term}</span>
                <Badge variant="outline" className="w-fit text-[10px]">
                  {g.bahasa}
                </Badge>
                <span className="text-sm text-foreground/85">{g.definition}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResearchMethodology;
