#!/usr/bin/env python3
"""Build Anthropic Skills folder structure from KB sources.

Creates pilot_starter_pack/agent_skills/ with 5 skills:
  galen-framework-v1-4    (48 chunks from kb_chunks_to_embed.jsonl)
  galen-lineage           (34 nodes from L3_formula_lineage.json)
  galen-tribal-knowledge  (29 entries from L4_tribal_knowledge.md)
  galen-golden-queries    (19 queries from L6_golden_queries.sql)
  galen-few-shot          (15 examples from 04_galen_few_shot.jsonl)

Each skill folder has SKILL.md (frontmatter + index) + supporting files.
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "agent_skills"


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-")[:80]


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def front(name: str, description: str, body: str) -> str:
    return f"---\nname: {name}\ndescription: {description}\n---\n\n{body}"


# ---------------------------------------------------------------------------
# Skill 1: galen-framework-v1-4
# ---------------------------------------------------------------------------
def build_framework() -> int:
    skill_dir = OUT / "galen-framework-v1-4"
    chunks_dir = skill_dir / "chunks"
    chunks: list[dict] = []
    with (ROOT / "kb_chunks_to_embed.jsonl").open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    # Group by source for the index
    from collections import defaultdict
    grouped: dict[str, list[dict]] = defaultdict(list)
    for c in chunks:
        grouped[c["source"]].append(c)

    # Write each chunk as its own MD
    index_lines = []
    for source, items in sorted(grouped.items()):
        index_lines.append(f"\n### {source} ({len(items)} chunks)\n")
        for c in items:
            fname = f"{slug(source)}__{slug(c['category'])}.md"
            content = (
                f"# {source} — {c['category']}\n\n"
                f"**Source:** `{source}`  \n"
                f"**Category:** `{c['category']}`\n\n"
                f"---\n\n{c['chunk_text']}\n"
            )
            write(chunks_dir / fname, content)
            index_lines.append(f"- [{c['category']}](chunks/{fname})")

    body = (
        "# Galen Framework v1.4 Knowledge Base\n\n"
        "Reference content for the JR PKB Palangka Raya pilot, including the "
        "framework v1.4 (segmen definitions, treatments, programs, anti-patterns, "
        "edge cases) and the Saptono & Khozen (2021) compliance paper.\n\n"
        "Use these chunks when answering questions about: 7-segmen taxonomy, "
        "treatment recommendations per segmen, the 9 SADAR programs, amnesty "
        "policy, channel routing, RACI, and known anti-patterns.\n\n"
        f"## Index ({len(chunks)} chunks total)\n"
        + "\n".join(index_lines)
        + "\n"
    )
    write(
        skill_dir / "SKILL.md",
        front(
            "galen-framework-v1-4",
            "Reference knowledge for the JR PKB Palangka Raya 7-segmen framework v1.4 — segment definitions, treatments, SADAR programs, anti-patterns. Load when answering questions about segmen taxonomy, amnesty policy, treatment routing, or framework rationale.",
            body,
        ),
    )
    return len(chunks)


# ---------------------------------------------------------------------------
# Skill 2: galen-lineage
# ---------------------------------------------------------------------------
def build_lineage() -> int:
    skill_dir = OUT / "galen-lineage"
    nodes_dir = skill_dir / "nodes"
    with (ROOT / "context_model" / "L3_formula_lineage.json").open(encoding="utf-8") as f:
        data = json.load(f)
    nodes = data.get("nodes", [])

    index_lines = []
    for n in nodes:
        nid = n["node_id"]
        ntype = n.get("node_type", "")
        layer = n.get("layer", "")
        table = n.get("table", "")
        column = n.get("column", "")
        desc = n.get("description", "")
        formula = n.get("formula", "")
        upstream = n.get("upstream", []) or []
        downstream = n.get("downstream", []) or []
        governance = n.get("governance", "")
        edge_cases = n.get("edge_cases", []) or []

        parts = [
            f"# {nid}",
            "",
            f"**Type:** {ntype}  \n"
            f"**Layer:** {layer}  \n"
            f"**Table:** `{table}`  \n"
            f"**Column:** `{column}`",
            "",
            "## Description",
            desc or "—",
        ]
        if formula:
            parts += ["", "## Formula", "```", formula, "```"]
        parts += [
            "",
            "## Upstream",
            "\n".join(f"- `{u}`" for u in upstream) if upstream else "—",
            "",
            "## Downstream",
            "\n".join(f"- `{d}`" for d in downstream) if downstream else "—",
            "",
            "## Governance",
            governance or "—",
        ]
        if edge_cases:
            parts += ["", "## Edge cases"] + [f"- {e}" for e in edge_cases]

        write(nodes_dir / f"{nid}.md", "\n".join(parts) + "\n")
        index_lines.append(f"- [`{nid}`](nodes/{nid}.md) — {desc[:80]}")

    body = (
        "# Galen Formula Lineage (L3)\n\n"
        f"Data lineage graph of {len(nodes)} nodes connecting raw columns → "
        "derived columns → metrics. Use this skill when you need to trace where "
        "a metric or column comes from, find upstream dependencies, or document "
        "the governance / edge cases of a derivation.\n\n"
        "Each node file lists upstream + downstream connections, the formula "
        "(if applicable), and known edge cases.\n\n"
        "## Nodes\n"
        + "\n".join(index_lines)
        + "\n"
    )
    write(
        skill_dir / "SKILL.md",
        front(
            "galen-lineage",
            "Trace data lineage between raw columns, derived columns, and metrics for the JR PKB pilot. Load when answering 'where does X come from' / dependency / impact-analysis questions.",
            body,
        ),
    )
    return len(nodes)


# ---------------------------------------------------------------------------
# Skill 3: galen-tribal-knowledge
# ---------------------------------------------------------------------------
def build_tribal() -> int:
    skill_dir = OUT / "galen-tribal-knowledge"
    entries_dir = skill_dir / "entries"
    md = (ROOT / "context_model" / "L4_tribal_knowledge.md").read_text(encoding="utf-8")

    # Match each "### L4-{CAT}-{NNN} — {title}" block until the next "### " or "---" or EOF
    pattern = r"### (L4-[A-Z]+-\d+)\s*(?:—|-)\s*(.+?)\n(.*?)(?=\n### |\n---\n|\Z)"
    matches = re.findall(pattern, md, flags=re.DOTALL)

    index_lines = []
    for entry_id, title, body_text in matches:
        title = title.strip()
        body_text = body_text.strip()
        content = f"# {entry_id} — {title}\n\n{body_text}\n"
        write(entries_dir / f"{entry_id}.md", content)
        index_lines.append(f"- [`{entry_id}`](entries/{entry_id}.md) — {title}")

    body = (
        "# Galen Tribal Knowledge (L4)\n\n"
        f"{len(matches)} institutional / domain-specific entries that explain the "
        "*why* behind data quirks, segment-classification edge cases, regulatory "
        "constraints, and operational tradeoffs. These are non-obvious facts that "
        "would otherwise be lost when a team member rotates off the project.\n\n"
        "Use this skill whenever a question's answer depends on *context* the "
        "data alone doesn't reveal — boundary drift, missing dimension codes, "
        "PII handling, why a metric is bronze-rated, etc.\n\n"
        "## Entries\n"
        + "\n".join(index_lines)
        + "\n"
    )
    write(
        skill_dir / "SKILL.md",
        front(
            "galen-tribal-knowledge",
            "Institutional knowledge for the JR PKB pilot — data quirks, classification edge cases, regulatory context, why-this-not-that decisions. Load when an answer needs context the data alone doesn't reveal.",
            body,
        ),
    )
    return len(matches)


# ---------------------------------------------------------------------------
# Skill 4: galen-golden-queries
# ---------------------------------------------------------------------------
def build_golden() -> int:
    skill_dir = OUT / "galen-golden-queries"
    queries_dir = skill_dir / "queries"
    sql = (ROOT / "context_model" / "L6_golden_queries.sql").read_text(encoding="utf-8")

    # Match "-- Q-{CAT}-{NNN} [TRUST] {description}\n{SQL body up to next -- Q- or -- ===}"
    pattern = r"-- (Q-[A-Z]+-\d+) \[(\w+)\] (.+?)\n([\s\S]*?)(?=\n-- Q-[A-Z]+-\d+|\n-- =====|\Z)"
    matches = re.findall(pattern, sql)

    index_lines = []
    by_cat: dict[str, list[tuple[str, str, str]]] = {}
    for qid, trust, desc, body_sql in matches:
        cat = qid.split("-")[1]
        body_sql = body_sql.strip()
        content = (
            f"# {qid} — {desc.strip()}\n\n"
            f"**Trust level:** {trust}  \n"
            f"**Category:** {cat}\n\n"
            f"## SQL\n\n```sql\n{body_sql}\n```\n"
        )
        write(queries_dir / f"{qid}.md", content)
        by_cat.setdefault(cat, []).append((qid, trust, desc.strip()))

    for cat in sorted(by_cat):
        index_lines.append(f"\n### {cat}\n")
        for qid, trust, desc in by_cat[cat]:
            index_lines.append(f"- [`{qid}`](queries/{qid}.md) [{trust}] — {desc}")

    body = (
        "# Galen Golden Queries (L6)\n\n"
        f"{len(matches)} verified SQL queries that answer the most common "
        "Galen questions. Each query is annotated with a trust level "
        "(VERIFIED / PROVISIONAL / UNTESTED) and a description of what it "
        "computes.\n\n"
        "Use this skill as the *first stop* when an answer requires a SQL "
        "query — these are vetted templates. Adapt them rather than writing "
        "from scratch when possible.\n\n"
        "## Index\n"
        + "\n".join(index_lines)
        + "\n"
    )
    write(
        skill_dir / "SKILL.md",
        front(
            "galen-golden-queries",
            "Vetted SQL templates for the most common Galen analytical questions in the JR PKB pilot. Load before writing any new SQL — adapt these instead.",
            body,
        ),
    )
    return len(matches)


# ---------------------------------------------------------------------------
# Skill 5: galen-few-shot
# ---------------------------------------------------------------------------
def build_few_shot() -> int:
    skill_dir = OUT / "galen-few-shot"
    examples_dir = skill_dir / "examples"
    examples = []
    with (ROOT / "04_galen_few_shot.jsonl").open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))

    index_lines = []
    for ex in examples:
        eid = ex.get("id", slug(ex.get("question", "")[:40]))
        cat = ex.get("category", "")
        q = ex.get("question", "")
        reasoning = ex.get("reasoning", "")
        answer = ex.get("expected_answer", "")
        content = (
            f"# {eid}\n\n"
            f"**Category:** {cat}\n\n"
            "## Question\n\n"
            f"{q}\n\n"
            "## Reasoning\n\n"
            f"{reasoning or '—'}\n\n"
            "## Expected answer\n\n"
            f"{answer}\n"
        )
        write(examples_dir / f"{eid}.md", content)
        index_lines.append(f"- [`{eid}`](examples/{eid}.md) ({cat}) — {q[:80]}")

    body = (
        "# Galen Few-Shot Examples\n\n"
        f"{len(examples)} bootstrap question→reasoning→answer examples that show "
        "Galen the expected style and depth of response. These are the "
        "in-context-learning anchors used to calibrate tone, citation style, "
        "and confidence framing.\n\n"
        "Load this skill at conversation start (or whenever Galen produces an "
        "off-tone response) to reset the response template.\n\n"
        "## Examples\n"
        + "\n".join(index_lines)
        + "\n"
    )
    write(
        skill_dir / "SKILL.md",
        front(
            "galen-few-shot",
            "Bootstrap question-reasoning-answer examples to calibrate Galen's response style, citation format, and confidence framing for the JR PKB pilot.",
            body,
        ),
    )
    return len(examples)


# ---------------------------------------------------------------------------
# Top-level README
# ---------------------------------------------------------------------------
def build_readme(counts: dict[str, int]) -> None:
    body = (
        "# Galen Agent Skills\n\n"
        "Anthropic Skills format knowledge base for the JR PKB Pilot "
        "(Palangka Raya, Kalimantan Tengah). Built from the pilot's L1-L6 "
        "context model + framework v1.4 chunks + few-shot examples.\n\n"
        "## Skills in this folder\n\n"
        "| Skill | Entries | Source |\n"
        "|---|---|---|\n"
        f"| `galen-framework-v1-4` | {counts['framework']} | kb_chunks_to_embed.jsonl |\n"
        f"| `galen-lineage` | {counts['lineage']} | context_model/L3_formula_lineage.json |\n"
        f"| `galen-tribal-knowledge` | {counts['tribal']} | context_model/L4_tribal_knowledge.md |\n"
        f"| `galen-golden-queries` | {counts['golden']} | context_model/L6_golden_queries.sql |\n"
        f"| `galen-few-shot` | {counts['few_shot']} | 04_galen_few_shot.jsonl |\n"
        f"| **Total** | **{sum(counts.values())}** | |\n\n"
        "## Regenerate\n\n"
        "```bash\n"
        "python3 build_agent_skills.py\n"
        "```\n"
    )
    write(OUT / "README.md", body)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    counts = {
        "framework": build_framework(),
        "lineage": build_lineage(),
        "tribal": build_tribal(),
        "golden": build_golden(),
        "few_shot": build_few_shot(),
    }
    build_readme(counts)
    total = sum(counts.values())
    print(f"Built agent_skills/ with 5 skills, {total} total entries:")
    for k, v in counts.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
