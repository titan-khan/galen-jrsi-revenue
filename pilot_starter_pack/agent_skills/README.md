# Galen Agent Skills

Anthropic Skills format knowledge base for the JR PKB Pilot (Palangka Raya, Kalimantan Tengah). Built from the pilot's L1-L6 context model + framework v1.4 chunks + few-shot examples.

## Skills in this folder

| Skill | Entries | Source |
|---|---|---|
| `galen-framework-v1-4` | 48 | kb_chunks_to_embed.jsonl |
| `galen-lineage` | 34 | context_model/L3_formula_lineage.json |
| `galen-tribal-knowledge` | 29 | context_model/L4_tribal_knowledge.md |
| `galen-golden-queries` | 19 | context_model/L6_golden_queries.sql |
| `galen-few-shot` | 15 | 04_galen_few_shot.jsonl |
| **Total** | **145** | |

## Regenerate

```bash
python3 build_agent_skills.py
```
