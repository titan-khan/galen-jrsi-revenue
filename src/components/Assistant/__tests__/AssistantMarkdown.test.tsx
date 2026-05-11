import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/MetricsContext', () => ({
  useMetrics: () => ({ metrics: [{ name: 'Tunggakan' }] }),
}));
vi.mock('@/contexts/SpecialistsContext', () => ({
  useSpecialists: () => ({ specialists: [] }),
}));

import { AssistantMarkdown } from '../AssistantMarkdown';

const SAMPLE_TABLE = `Breakdown:

| Segmen | Kendaraan | % Populasi | Total Est PKB | Rata-rata Tunggakan | Cakupan HP | vs Target Framework |
|--------|-----------|------------|---------------|---------------------|------------|---------------------|
| Patuh Aktif | 107.960 | 25,2% | Rp 52,49 miliar | -181 hari | 100% | 15% di bawah target 40% |
| Tidak Patuh Pasif | 25.039 | 5,9% | Rp 9,48 miliar | 529 hari | 99,9% | Sesuai target 6% |
| TOTAL | 427.977 | 100% | Rp 147,13 miliar | Median 2.122 hari | 73,5% | — |
`;

describe('AssistantMarkdown', () => {
  it('renders a GFM table as proper HTML with overflow wrapper', () => {
    const { container } = render(<AssistantMarkdown>{SAMPLE_TABLE}</AssistantMarkdown>);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(container.querySelectorAll('thead th').length).toBe(7);
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
    expect(table?.parentElement?.className).toContain('overflow-x-auto');
  });

  it('renders @mention chips inside paragraphs', () => {
    const { container } = render(
      <AssistantMarkdown>{`Lihat @Tunggakan untuk detail.`}</AssistantMarkdown>,
    );
    const mentionSpan = container.querySelector('span.inline-flex');
    expect(mentionSpan).not.toBeNull();
    expect(mentionSpan?.textContent).toContain('Tunggakan');
  });

  it('renders markdown bullet list as <ul><li>', () => {
    const { container } = render(
      <AssistantMarkdown>{`- alpha\n- beta`}</AssistantMarkdown>,
    );
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('li').length).toBe(2);
  });

  it('renders inline @mention inside a table cell', () => {
    const md = `| col | val |\n|-----|-----|\n| Ref | @Tunggakan |\n`;
    const { container } = render(<AssistantMarkdown>{md}</AssistantMarkdown>);
    const cellChip = container.querySelector('td span.inline-flex');
    expect(cellChip).not.toBeNull();
    expect(cellChip?.textContent).toContain('Tunggakan');
  });
});
