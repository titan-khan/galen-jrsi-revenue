# L5 — Learning Memory

**Layer:** L5 (Six-Layer Context Model)
**Purpose:** Live, growing memory yang **belajar dari setiap interaksi user-Galen**. Berbeda dengan L1-L4 yang static curated, L5 adalah journal: failed answers, surprising user feedback, new patterns yang belum masuk L4.
**Format:** JSONL append-only log + summary index
**Last updated:** 2026-05-05
**Companion file:** `L5_learning_memory.jsonl` (append-only log)

---

## 1. Why Learning Memory

L1-L4 adalah pengetahuan kita **hari ini**. L5 adalah pengetahuan yang Galen **akumulasi seiring waktu**.

Tanpa L5:
- Galen akan ulang kesalahan yang sama.
- User feedback hilang setelah session selesai.
- Tidak ada feedback loop ke L4 atau L6.

Dengan L5:
- Pattern yang muncul berulang → di-promote ke L4.
- Successful query → di-promote ke L6 (Golden Queries).
- Gagal recovery → flagged untuk human review.

---

## 2. Structure

L5 punya 2 components:

### 2a. Append-only log (`L5_learning_memory.jsonl`)
Setiap entry = 1 interaction event.

```json
{
  "event_id": "evt-2026-05-05-001",
  "timestamp": "2026-05-05T10:30:00Z",
  "session_id": "sess-abc123",
  "event_type": "user_correction" | "successful_answer" | "fallback_to_human" | "data_anomaly_detected" | "new_question_pattern",
  "user_query": "...",
  "galen_response": "...",
  "user_feedback": "...",  // optional
  "outcome": "success" | "failure" | "partial",
  "tags": ["segmen", "K1", "konversi"],
  "promote_to": null | "L4" | "L6",  // candidate for promotion
  "reviewer_note": "..."  // optional, by reviewer
}
```

### 2b. Summary index (this file)
Curated review of patterns. Updated weekly.

---

## 3. Event Types

### `user_correction`
User secara eksplisit koreksi Galen ("bukan, yang benar X").

**Action:** Save dengan tags relevant. Reviewer triage: jika koreksi valid + recurring, promote ke L4.

### `successful_answer`
Galen menjawab tepat, user confirms ("oke makasih", "perfect", thumbs up).

**Action:** Save query + answer. Jika query unique + reusable, candidate untuk L6 (Golden Queries).

### `fallback_to_human`
Galen gagal answer atau acknowledge "saya tidak yakin". User escalate ke human expert.

**Action:** Save dengan high priority. Reviewer harus identify gap di L1-L4.

### `data_anomaly_detected`
Galen menemukan inconsistency saat answering (misalnya value out of range).

**Action:** Save sebagai data quality alert. Trigger investigation.

### `new_question_pattern`
User tanya hal baru yang belum pernah ditanyakan.

**Action:** Save. Jika muncul 3+ times, promote ke L6 dengan verified SQL.

---

## 4. Seed Entries (Bootstrap)

Untuk pilot kickoff, kita seed L5 dengan beberapa contoh pattern dari historical conversation. Ini memberi Galen "warm start".

### Seed-001: Konversi rate clarification
```json
{
  "event_id": "seed-001",
  "timestamp": "2026-05-05T00:00:00Z",
  "event_type": "user_correction",
  "user_query": "Apa konversi K1 selalu 12-18%?",
  "galen_response": "(hypothetical) Ya, K1 konversi 12-18%.",
  "user_feedback": "Jangan langsung yakin. Itu range historical, bisa beda per kampanye.",
  "outcome": "failure",
  "tags": ["konversi", "K1", "framing"],
  "promote_to": "L4",
  "reviewer_note": "Already captured in L4-TREATMENT-003."
}
```

### Seed-002: Refresh frequency
```json
{
  "event_id": "seed-002",
  "timestamp": "2026-05-05T00:00:00Z",
  "event_type": "new_question_pattern",
  "user_query": "Kapan data ini di-refresh?",
  "galen_response": "Data pilot ini one-shot snapshot per 2025-05-01, tidak ada auto-refresh.",
  "user_feedback": "(positive)",
  "outcome": "success",
  "tags": ["refresh", "pilot_scope"],
  "promote_to": null,
  "reviewer_note": "Captured in L4-PILOT-002."
}
```

### Seed-003: Privacy concern
```json
{
  "event_id": "seed-003",
  "timestamp": "2026-05-05T00:00:00Z",
  "event_type": "user_correction",
  "user_query": "Tunjukkan nomor telepon 10 pemilik di K1.",
  "galen_response": "(should be) Maaf, tidak bisa expose nomor pribadi (UU PDP). Saya bisa kasih aggregate count.",
  "outcome": "success",
  "tags": ["privacy", "pdp"],
  "promote_to": null,
  "reviewer_note": "Aligned with L4-REGULASI-003."
}
```

### Seed-004: Recovery projection ambiguity
```json
{
  "event_id": "seed-004",
  "timestamp": "2026-05-05T00:00:00Z",
  "event_type": "user_correction",
  "user_query": "Berapa revenue yang bisa kita recover?",
  "galen_response": "Total potensi PKB Rp X miliar.",
  "user_feedback": "Kalau cuma bilang potensi tanpa konversi, misleading.",
  "outcome": "failure",
  "tags": ["recovery", "framing"],
  "promote_to": "L4",
  "reviewer_note": "Already in L4-METRIC-001 + L4-METRIC-002. Galen prompt update needed."
}
```

### Seed-005: Cross-daerah generalization
```json
{
  "event_id": "seed-005",
  "timestamp": "2026-05-05T00:00:00Z",
  "event_type": "user_correction",
  "user_query": "Apakah K1 di daerah Bali juga 1-90 hari?",
  "galen_response": "(hypothetical) Ya, sama.",
  "user_feedback": "Jangan generalize. Pilot ini Palangka Raya specific.",
  "outcome": "failure",
  "tags": ["scope", "generalization"],
  "promote_to": "L4",
  "reviewer_note": "Already in L4-PILOT-001 and L4-SEGMEN-004."
}
```

---

## 5. Pattern Recognition Heuristics

Galen flags an event for promotion if:

| Condition | Promote to |
|---|---|
| Same correction muncul 3+ times | L4 (new tribal knowledge) |
| User asks same question 5+ times across sessions | L6 (golden query) |
| Data anomaly hits same condition 2+ times | L4-DATA |
| User explicitly says "always", "never", "harus" → encode rule | L4 |

---

## 6. Review Workflow

### Weekly review (during pilot)
1. Read all `L5_learning_memory.jsonl` entries dari minggu lalu.
2. Cluster by tags.
3. For each cluster:
   - 3+ events → propose L4 entry.
   - Reusable query → propose L6 entry.
   - Open question → assign owner for clarification.
4. Update `L4_tribal_knowledge.md` and/or `L6_golden_queries.sql`.
5. Mark reviewed entries dengan `reviewer_note`.

### Monthly retrospective
- Trend: outcome distribution (success/failure/partial).
- Top failure modes → highlight di standup.
- Top success patterns → ensure all in L6.

---

## 7. JSONL Initial Template

`L5_learning_memory.jsonl` starts dengan 5 seed entries (above) lalu append-only.

Format strictly 1 JSON per line, no commas/wrapping.

```jsonl
{"event_id":"seed-001","timestamp":"2026-05-05T00:00:00Z","event_type":"user_correction","user_query":"Apa konversi K1 selalu 12-18%?","galen_response":"(hypothetical) Ya, K1 konversi 12-18%.","user_feedback":"Jangan langsung yakin. Itu range historical, bisa beda per kampanye.","outcome":"failure","tags":["konversi","K1","framing"],"promote_to":"L4","reviewer_note":"Already captured in L4-TREATMENT-003."}
{"event_id":"seed-002","timestamp":"2026-05-05T00:00:00Z","event_type":"new_question_pattern","user_query":"Kapan data ini di-refresh?","galen_response":"Data pilot ini one-shot snapshot per 2025-05-01, tidak ada auto-refresh.","user_feedback":"(positive)","outcome":"success","tags":["refresh","pilot_scope"],"promote_to":null,"reviewer_note":"Captured in L4-PILOT-002."}
{"event_id":"seed-003","timestamp":"2026-05-05T00:00:00Z","event_type":"user_correction","user_query":"Tunjukkan nomor telepon 10 pemilik di K1.","galen_response":"Maaf, tidak bisa expose nomor pribadi (UU PDP). Saya bisa kasih aggregate count.","outcome":"success","tags":["privacy","pdp"],"promote_to":null,"reviewer_note":"Aligned with L4-REGULASI-003."}
{"event_id":"seed-004","timestamp":"2026-05-05T00:00:00Z","event_type":"user_correction","user_query":"Berapa revenue yang bisa kita recover?","galen_response":"Total potensi PKB Rp X miliar.","user_feedback":"Kalau cuma bilang potensi tanpa konversi, misleading.","outcome":"failure","tags":["recovery","framing"],"promote_to":"L4","reviewer_note":"Galen prompt update needed."}
{"event_id":"seed-005","timestamp":"2026-05-05T00:00:00Z","event_type":"user_correction","user_query":"Apakah K1 di daerah Bali juga 1-90 hari?","galen_response":"(hypothetical) Ya, sama.","user_feedback":"Jangan generalize. Pilot ini Palangka Raya specific.","outcome":"failure","tags":["scope","generalization"],"promote_to":"L4","reviewer_note":"Already in L4-PILOT-001."}
```

(File version juga di-save di `L5_learning_memory.jsonl`.)

---

## 8. Storage in Supabase (Future)

Untuk pilot, JSONL local cukup. Untuk production:

```sql
CREATE TABLE kb.learning_memory (
    event_id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    user_query TEXT,
    galen_response TEXT,
    user_feedback TEXT,
    outcome TEXT,
    tags TEXT[],
    promote_to TEXT,
    reviewer_note TEXT,
    embedding VECTOR(1536),  -- for semantic retrieval
    created_at TIMESTAMPTZ DEFAULT now()
);
```

Galen at runtime: query `kb.learning_memory` for similar past queries → use as one-shot examples.

---

## 9. Privacy & Safety

L5 entries berisi user query yang mungkin contain context sensitive (e.g., specific nopol). Untuk pilot:

- **Redaction rule:** Sebelum log, redact specific identifiers (nopol, NIK, telp).
- **Aggregation rule:** Setelah review, simpan pattern abstract (e.g., "user query nopol-spesifik untuk lookup phone") bukan raw text.

---

## 10. How Galen Uses L5

1. **Pre-query check:** Top-3 similar past queries via embedding similarity. Use sebagai context.
2. **Self-correction:** Sebelum return answer, check L5 untuk corrections relevant ke topic.
3. **Confidence calibration:** Jika ada banyak past failures di topic ini, mark answer "low confidence + recommend human review".
4. **Continuous improvement:** Append every interaction, even successful ones, untuk future training data.

---

## 11. KPI for L5 Health

| KPI | Target | Why |
|---|---|---|
| Entries per week | >=10 | Active learning |
| Success rate trend | >70% week-over-week growth | Improving |
| Promote-to-L4 rate | 1-3 per week | Knowledge codification |
| Promote-to-L6 rate | 1-2 per week | Query reuse |
| Time-to-review | <7 days | Stays fresh |
| Failure recurrence rate | <10% | Lessons sticking |
