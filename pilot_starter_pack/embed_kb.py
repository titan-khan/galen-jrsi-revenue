#!/usr/bin/env python3
"""
embed_kb.py — Helper script untuk embed KB content ke Supabase pgvector.

Embeds TWO sources:
  1. kb_chunks_to_embed.jsonl       → kb.reference_docs (framework v1.4 + paper)
  2. 04_galen_few_shot.jsonl         → kb.few_shot       (Q→reasoning→answer examples)

Prerequisites:
  - Supabase project sudah di-setup (run supabase_setup_full.sql)
  - Environment variables di .env:
      SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD
      OPENAI_API_KEY

Usage:
  python embed_kb.py                          # embed both sources
  python embed_kb.py --skip-reference         # only embed few_shot
  python embed_kb.py --skip-fewshot           # only embed reference docs
  python embed_kb.py --reset                  # delete existing rows + re-embed

Cost estimate (text-embedding-3-small):
  - ~40 chunks reference docs × ~200 tokens each = ~8K tokens = $0.0002
  - ~15 few-shot questions × ~50 tokens = ~750 tokens = $0.00002
  - Total: <$0.01 per full run
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

try:
    from openai import OpenAI
except ImportError:
    print("❌ openai library not installed. Run: pip install openai")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # optional


# =============================================================================
# CONFIG
# =============================================================================

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_KB_CHUNKS_PATH = SCRIPT_DIR / "kb_chunks_to_embed.jsonl"
DEFAULT_FEW_SHOT_PATH = SCRIPT_DIR / "04_galen_few_shot.jsonl"


# =============================================================================
# HELPERS
# =============================================================================

def get_conn():
    """Connect to Supabase Postgres via pooler."""
    return psycopg2.connect(
        host=os.environ["SUPABASE_DB_HOST"],
        port=int(os.environ.get("SUPABASE_DB_PORT", "6543")),
        user=os.environ["SUPABASE_DB_USER"],
        password=os.environ["SUPABASE_DB_PASSWORD"],
        dbname=os.environ.get("SUPABASE_DB_NAME", "postgres"),
        sslmode="require",
    )


def get_openai_client():
    """Initialize OpenAI client. Validate API key."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set in environment")
        sys.exit(1)
    return OpenAI(api_key=api_key)


def embed_text(client: OpenAI, text: str, retries: int = 3) -> list[float]:
    """Embed text via OpenAI dengan exponential backoff retry."""
    for attempt in range(retries):
        try:
            resp = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text,
            )
            return resp.data[0].embedding
        except Exception as e:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
            print(f"     ⚠ Embedding attempt {attempt + 1} failed: {e}. Retry in {wait}s...")
            time.sleep(wait)


# =============================================================================
# EMBED REFERENCE DOCS
# =============================================================================

def embed_reference_docs(jsonl_path: Path, conn, openai_client, reset: bool = False):
    """Embed framework v1.4 + paper chunks ke kb.reference_docs."""
    print(f"\n[Reference Docs] Embedding from {jsonl_path.name}...")

    if not jsonl_path.exists():
        print(f"❌ File not found: {jsonl_path}")
        return 0

    # Read all chunks
    chunks = []
    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    print(f"  → {len(chunks)} chunks loaded from JSONL")

    # Optional: reset existing rows
    if reset:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE kb.reference_docs")
        conn.commit()
        print("  → Truncated existing kb.reference_docs (--reset)")

    # Embed each chunk
    rows = []
    for i, chunk in enumerate(chunks, 1):
        text = chunk["chunk_text"]
        try:
            embedding = embed_text(openai_client, text)
            rows.append((
                chunk["source"],
                chunk.get("category", ""),
                text,
                json.dumps(chunk.get("metadata", {})),
                embedding,
            ))
            if i % 10 == 0 or i == len(chunks):
                print(f"     {i}/{len(chunks)} embedded ({chunk['source']}: {chunk.get('category', '')})")
            time.sleep(0.05)  # gentle rate limiting
        except Exception as e:
            print(f"     ✗ Failed chunk {i} ({chunk.get('source')}: {chunk.get('category')}): {e}")

    # Bulk insert
    if rows:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """INSERT INTO kb.reference_docs
                     (source, category, chunk_text, chunk_metadata, embedding)
                   VALUES %s""",
                rows,
                template="(%s, %s, %s, %s::jsonb, %s::vector)",
            )
        conn.commit()
        print(f"  ✓ {len(rows)} chunks inserted ke kb.reference_docs")

    return len(rows)


# =============================================================================
# LOAD FEW-SHOT EXAMPLES
# =============================================================================

def load_few_shot(jsonl_path: Path, conn, openai_client, reset: bool = False):
    """Embed question + insert few-shot examples ke kb.few_shot."""
    print(f"\n[Few-Shot] Loading from {jsonl_path.name}...")

    if not jsonl_path.exists():
        print(f"❌ File not found: {jsonl_path}")
        return 0

    examples = []
    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))

    print(f"  → {len(examples)} few-shot examples loaded")

    if reset:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE kb.few_shot")
        conn.commit()
        print("  → Truncated existing kb.few_shot (--reset)")

    # Embed question untuk similarity search
    rows = []
    for i, ex in enumerate(examples, 1):
        question = ex["question"]
        try:
            embedding = embed_text(openai_client, question)
            rows.append((
                ex.get("category", "general"),
                question,
                ex.get("reasoning", ""),
                ex["expected_answer"],
                embedding,
            ))
            if i % 5 == 0 or i == len(examples):
                print(f"     {i}/{len(examples)} embedded ({ex.get('category', 'general')})")
            time.sleep(0.05)
        except Exception as e:
            print(f"     ✗ Failed example {i}: {e}")

    if rows:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """INSERT INTO kb.few_shot
                     (category, question, reasoning, expected_answer, embedding)
                   VALUES %s""",
                rows,
                template="(%s, %s, %s, %s, %s::vector)",
            )
        conn.commit()
        print(f"  ✓ {len(rows)} few-shot examples inserted ke kb.few_shot")

    return len(rows)


# =============================================================================
# VERIFICATION
# =============================================================================

def verify(conn):
    """Sanity check setelah embed."""
    print("\n[Verification]")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT source, COUNT(*)
            FROM kb.reference_docs
            GROUP BY source ORDER BY 1
        """)
        ref_counts = cur.fetchall()
        print("  reference_docs by source:")
        for source, count in ref_counts:
            print(f"    {source}: {count} chunks")

        cur.execute("SELECT COUNT(*) FROM kb.reference_docs")
        total_ref = cur.fetchone()[0]
        print(f"  Total reference_docs: {total_ref}")

        cur.execute("SELECT COUNT(*) FROM kb.few_shot")
        total_few = cur.fetchone()[0]
        print(f"  Total few_shot: {total_few}")

        # Test similarity search
        cur.execute("""
            SELECT source, category, LEFT(chunk_text, 80) AS preview
            FROM kb.reference_docs
            WHERE embedding IS NOT NULL
            LIMIT 1
        """)
        sample = cur.fetchone()
        if sample:
            print(f"\n  Sample row check:")
            print(f"    source: {sample[0]}")
            print(f"    category: {sample[1]}")
            print(f"    preview: {sample[2]}...")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Embed KB content to Supabase pgvector")
    parser.add_argument("--reference-jsonl", type=Path, default=DEFAULT_KB_CHUNKS_PATH,
                        help="Path to kb_chunks_to_embed.jsonl")
    parser.add_argument("--fewshot-jsonl", type=Path, default=DEFAULT_FEW_SHOT_PATH,
                        help="Path to 04_galen_few_shot.jsonl")
    parser.add_argument("--skip-reference", action="store_true",
                        help="Skip embedding reference docs")
    parser.add_argument("--skip-fewshot", action="store_true",
                        help="Skip loading few-shot examples")
    parser.add_argument("--reset", action="store_true",
                        help="Truncate existing rows before insert")
    args = parser.parse_args()

    print("=" * 70)
    print("JR Pilot — KB Embedding Helper")
    print("=" * 70)

    # Validate env
    required_env = ["SUPABASE_DB_HOST", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD", "OPENAI_API_KEY"]
    missing = [k for k in required_env if not os.environ.get(k)]
    if missing:
        print(f"❌ Missing environment variables: {missing}")
        print("   Set di .env file atau export di shell")
        sys.exit(1)

    print(f"  Embedding model: {EMBEDDING_MODEL} ({EMBEDDING_DIM} dim)")
    print(f"  Reset mode: {args.reset}")

    # Connect
    print("\n  Connecting to Supabase...")
    conn = get_conn()
    print("  ✓ Connected")

    openai_client = get_openai_client()
    print("  ✓ OpenAI client ready")

    try:
        # Phase 1: Reference docs
        if not args.skip_reference:
            embed_reference_docs(args.reference_jsonl, conn, openai_client, args.reset)
        else:
            print("\n[Reference Docs] Skipped (--skip-reference)")

        # Phase 2: Few-shot
        if not args.skip_fewshot:
            load_few_shot(args.fewshot_jsonl, conn, openai_client, args.reset)
        else:
            print("\n[Few-Shot] Skipped (--skip-fewshot)")

        # Phase 3: Verify
        verify(conn)

        print("\n" + "=" * 70)
        print("✓ KB EMBEDDING COMPLETE")
        print("=" * 70)
        print("\nNext steps:")
        print("  1. Test similarity search:")
        print("     SELECT * FROM kb.search_docs(")
        print("       (SELECT embedding FROM kb.reference_docs LIMIT 1), 0.5, 5);")
        print("  2. Configure Galen specialist dengan tool: search_docs RPC")

    except Exception as e:
        print(f"\n❌ Failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
