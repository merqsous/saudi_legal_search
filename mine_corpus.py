"""Mine the judgment corpus for distributional semantics.

Extracts from judgment chunks:
- Frequent legal terms (TF)
- Co-occurrence statistics (PMI — Pointwise Mutual Information)
- Court-type discriminative vocabulary
- Common legal phrases (n-grams)

Output: corpus_semantics.json — used by legal_kb.py for corpus-driven query expansion.

Usage:
    python mine_corpus.py            # run full analysis (samples 10k chunks)
    python mine_corpus.py --stats    # show stats about existing data
"""
import json
import re
import argparse
from collections import Counter, defaultdict
from api.db import query_all
from api.routes.search import normalize_arabic

SAMPLE_SIZE = 10000
OUTPUT_FILE = "corpus_semantics.json"

# Arabic stopwords to exclude from term analysis
STOPWORDS = {
    'في', 'من', 'على', 'الى', 'عن', 'مع', 'او', 'و', 'ال', 'لا', 'ما', 'هو', 'هي',
    'هذا', 'هذه', 'التي', 'الذي', 'عند', 'قد', 'ثم', 'بين', 'كل', 'بعض', 'غير',
    'حيث', 'كما', 'لكن', 'ان', 'اذا', 'اذ', 'لم', 'لن', 'ولا', 'الا', 'بل', 'حتى',
    'انه', 'انها', 'هناك', 'به', 'بها', 'له', 'لها', 'منه', 'منها', 'عليه', 'عليها',
    'هذا', 'هذه', 'اولئك', 'كان', 'كانت', 'يكون', 'تكون', 'اي', 'ايضا', 'فقط',
    'وقال', 'قالت', 'يقول', 'تقول', 'لان', 'لانه', 'بناء', 'وفق', 'وفقا', 'حسب',
    'خلال', 'بعد', 'قبل', 'عند', 'عنده', 'عندها', 'دون', 'بدون', 'نتيجه', 'اضافه',
    'المحكمه', 'الدعوي', 'المدعي', 'المدعيه', 'المدعي_عليه', 'المدعيه_عليها',
}


def fetch_sample():
    """Fetch a representative sample of chunks with court type info."""
    print(f"Fetching {SAMPLE_SIZE} chunks (stratified by court type)...")
    rows = query_all(f"""
        SELECT jc.chunk_text, ct.code as court_type
        FROM judgment_chunks jc
        JOIN judgments j ON jc.judgment_id = j.id
        JOIN cases c ON j.case_id = c.id
        LEFT JOIN court_types ct ON c.court_type_id = ct.id
        WHERE length(jc.chunk_text) >= 100
        ORDER BY RANDOM()
        LIMIT {SAMPLE_SIZE}
    """)
    print(f"Fetched {len(rows)} chunks")
    return rows


def extract_terms(text: str) -> list[str]:
    """Extract meaningful legal terms from Arabic text."""
    normalized = normalize_arabic(text)
    # Split on whitespace and punctuation
    words = re.split(r'\s+', normalized)
    terms = []
    for w in words:
        w = w.strip()
        # Keep terms 3-20 chars, not stopwords, not pure numbers
        if 3 <= len(w) <= 20 and w not in STOPWORDS and not w.isdigit():
            terms.append(w)
    return terms


def extract_phrases(text: str, n: int = 2) -> list[str]:
    """Extract n-gram phrases (2-word legal phrases)."""
    normalized = normalize_arabic(text)
    words = re.split(r'\s+', normalized)
    phrases = []
    for i in range(len(words) - n + 1):
        gram = words[i:i+n]
        if all(3 <= len(w) <= 15 and w not in STOPWORDS for w in gram):
            phrases.append(" ".join(gram))
    return phrases


def analyze(rows):
    """Run the full distributional analysis."""
    print("Extracting terms and computing statistics...")

    # Per-court-type term frequencies
    court_terms: dict[str, Counter] = defaultdict(Counter)
    # Overall term frequency
    all_terms: Counter = Counter()
    # Term co-occurrence (terms appearing in same chunk)
    cooccur: Counter = Counter()
    # Phrase frequency
    phrases: Counter = Counter()
    # Chunks per court type
    court_counts: Counter = Counter()

    for i, row in enumerate(rows):
        if i % 1000 == 0:
            print(f"  Processing chunk {i}/{len(rows)}...")

        text = row["chunk_text"]
        court = row["court_type"] or "unknown"
        court_counts[court] += 1

        terms = extract_terms(text)

        # Update term frequencies
        court_terms[court].update(terms)
        all_terms.update(terms)

        # Update co-occurrence (unique terms per chunk)
        unique_terms = list(set(terms))
        for j in range(len(unique_terms)):
            for k in range(j + 1, len(unique_terms)):
                pair = tuple(sorted([unique_terms[j], unique_terms[k]]))
                cooccur[pair] += 1

        # Extract phrases (sample to save time)
        if i % 5 == 0:  # every 5th chunk
            phrases.update(extract_phrases(text))

    return court_terms, all_terms, cooccur, phrases, court_counts


def compute_pmi(all_terms: Counter, cooccur: Counter, total_docs: int, min_count: int = 5):
    """Compute PMI for top term pairs."""
    print("Computing PMI for co-occurring terms...")

    # Only consider frequent terms (appear >= min_count times)
    frequent = {t for t, c in all_terms.items() if c >= min_count}
    top_pairs = []

    import math
    for (t1, t2), count in cooccur.most_common(5000):
        if t1 not in frequent or t2 not in frequent:
            continue
        p_t1 = all_terms[t1] / total_docs
        p_t2 = all_terms[t2] / total_docs
        p_pair = count / total_docs
        if p_t1 > 0 and p_t2 > 0:
            pmi = math.log2(p_pair / (p_t1 * p_t2))
            if pmi > 2.0 and count >= 10:  # Strong association
                top_pairs.append({
                    "terms": [t1, t2],
                    "count": count,
                    "pmi": round(pmi, 2),
                })

    return top_pairs[:500]


def compute_discriminative_terms(court_terms: dict[str, Counter], court_counts: Counter, min_count: int = 10):
    """Find terms that are discriminative for each court type (TF-IDF style)."""
    print("Computing discriminative terms per court type...")

    results = {}
    for court, terms in court_terms.items():
        if court_counts[court] < 100:
            continue

        total_in_court = court_counts[court]
        scored = []
        for term, count in terms.items():
            if count < min_count:
                continue
            # Term frequency in this court
            tf_in = count / total_in_court
            # Term frequency across all courts
            total_across = sum(court_terms[c].get(term, 0) for c in court_terms)
            total_all = sum(court_counts.values())
            tf_all = total_across / total_all
            if tf_all > 0:
                # High score = frequent here, rare elsewhere
                score = tf_in / tf_all
                scored.append({"term": term, "count": count, "score": round(score, 2)})

        scored.sort(key=lambda x: (-x["score"], -x["count"]))
        results[court] = scored[:50]

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stats", action="store_true", help="Show stats about existing output")
    args = parser.parse_args()

    if args.stats:
        try:
            with open(OUTPUT_FILE) as f:
                data = json.load(f)
            print(f"Concepts in file: {len(data.get('discriminative_terms', {}))}")
            print(f"Top phrases: {len(data.get('phrases', []))}")
            print(f"PMI pairs: {len(data.get('pmi_pairs', []))}")
        except FileNotFoundError:
            print("No existing output file")
        return

    rows = fetch_sample()
    court_terms, all_terms, cooccur, phrases, court_counts = analyze(rows)

    print(f"\nTotal unique terms: {len(all_terms)}")
    print(f"Total co-occurring pairs: {len(cooccur)}")
    print(f"Total phrases: {len(phrases)}")
    print(f"Court distribution: {dict(court_counts)}")

    # Compute advanced statistics
    pmi_pairs = compute_pmi(all_terms, cooccur, len(rows))
    discriminative = compute_discriminative_terms(court_terms, court_counts)

    # Top frequent terms overall
    top_terms = [{"term": t, "count": c} for t, c in all_terms.most_common(500)]

    # Top phrases
    top_phrases = [{"phrase": p, "count": c} for p, c in phrases.most_common(200) if c >= 3]

    # Save results
    output = {
        "total_chunks_analyzed": len(rows),
        "court_distribution": dict(court_counts),
        "top_terms": top_terms,
        "top_phrases": top_phrases,
        "pmi_pairs": pmi_pairs,
        "discriminative_terms": discriminative,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to {OUTPUT_FILE}")
    print(f"  - {len(top_terms)} frequent terms")
    print(f"  - {len(top_phrases)} phrases")
    print(f"  - {len(pmi_pairs)} PMI pairs")
    print(f"  - {len(discriminative)} court types with discriminative terms")


if __name__ == "__main__":
    main()
