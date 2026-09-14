"""Saudi Legal Knowledge Base: ontology, taxonomy, alternative labels, concept graph.

Provides query enrichment for search:
- Alternative labels (synonyms): "طرد العامل" -> "إنهاء غير مشروع" -> "الفصل التعسفي"
- Concept relations: related legal concepts for query expansion
- Taxonomy: hierarchical domain classification for filtering
- Law article references: common citations in Saudi judgments

Usage in search pipeline:
    from api.legal_kb import enrich_query_with_kb, detect_concepts
    concepts = detect_concepts(query)  # find KB concepts in user query
    enriched = enrich_query_with_kb(query, concepts)  # add synonyms + related
"""
from functools import lru_cache

# ============================================================
# TAXONOMY / ONTOLOGY
# Hierarchical classification of Saudi legal system
# ============================================================

TAXONOMY = {
    "labor": {
        "name_ar": "عمالي",
        "subcategories": {
            "termination": {
                "name_ar": "إنهاء عقد العمل",
                "concepts": ["unjust_termination", "notice_period", "termination_compensation", "arbitrary_dismissal"]
            },
            "wages": {
                "name_ar": "الأجور والمستحقات",
                "concepts": ["unpaid_wages", "overtime", "end_of_service", "leave_pay"]
            },
            "contract": {
                "name_ar": "عقد العمل",
                "concepts": ["work_contract_terms", "probation", "non_compete"]
            },
            "work_injury": {
                "name_ar": "إصابات العمل",
                "concepts": ["work_injury_compensation", "occupational_disease"]
            },
        }
    },
    "commercial": {
        "name_ar": "تجاري",
        "subcategories": {
            "partnership": {
                "name_ar": "منازعات الشركات والشراكة",
                "concepts": ["partner_withdrawal", "partnership_liquidation", "partner_disputes", "company_establishment"]
            },
            "contracts": {
                "name_ar": "العقود التجارية",
                "concepts": ["contract_breach", "penalty_clause", "contract_termination", "force_majeure"]
            },
            "commercial_papers": {
                "name_ar": "الأوراق التجارية",
                "concepts": ["bounced_cheque", "promissory_note", "commercial_note"]
            },
            "agencies": {
                "name_ar": "الوكالات التجارية",
                "concepts": ["commercial_agency", "agency_termination", "agency_compensation"]
            },
            "ip": {
                "name_ar": "الملكية الفكرية",
                "concepts": ["trademark_dispute", "trademark_registration", "trademark_similarity"]
            },
        }
    },
    "personal_status": {
        "name_ar": "أحوال شخصية",
        "subcategories": {
            "marriage": {
                "name_ar": "الزواج والطلاق",
                "concepts": ["divorce", "khul", "dowry", "marriage_contract"]
            },
            "custody": {
                "name_ar": "الحضانة",
                "concepts": ["custody", "visitation", "custody_transfer"]
            },
            "financial": {
                "name_ar": "الحقوق المالية",
                "concepts": ["alimony", "nafaqa_children", "mutaa"]
            },
            "inheritance": {
                "name_ar": "الميراث",
                "concepts": ["estate_division", "will_bequest", "heir_determination"]
            },
        }
    },
    "general": {
        "name_ar": "عام",
        "subcategories": {
            "criminal": {
                "name_ar": "الجزائي",
                "concepts": ["fraud", "forgery", "breach_of_trust", "assault"]
            },
            "civil": {
                "name_ar": "المدني",
                "concepts": ["property_dispute", "debt_claim", "damages", "lease_dispute"]
            },
        }
    },
}

# ============================================================
# CONCEPTS (Knowledge Graph Nodes)
# Each concept: canonical term, alternative labels, relations, laws
# ============================================================

CONCEPTS = {
    # --- LABOR ---
    "unjust_termination": {
        "canonical": "الإنهاء غير المشروع للعقد",
        "labels": ["الفصل التعسفي", "الطرد التعسفي", "الطرد بدون سبب", "الفصل بدون سبب مشروع",
                   "إنهاء العقد بغير سبب", "الإقالة الظالمة", "الطرد الجائر",
                   "طرد من العمل بدون سبب", "فصل من العمل", "طردني من العمل", "فصلني من الدوام"],
        "related": ["termination_compensation", "notice_period", "arbitrary_dismissal"],
        "laws": ["المادة 77", "المادة 81 من نظام العمل"],
        "court": "labor",
    },
    "termination_compensation": {
        "canonical": "التعويض عن إنهاء العقد",
        "labels": ["بدل الإنهاء", "تعويض الفصل", "التعويض عن الطرد", "بدل الفصل",
                   "الحد الأقصى للتعويض", "أجر شهرين", "تعويض الإنهاء الغير مشروع",
                   "تعويض نهاية العلاقة العمالية"],
        "related": ["unjust_termination", "end_of_service", "notice_period"],
        "laws": ["المادة 77 من نظام العمل"],
        "court": "labor",
    },
    "arbitrary_dismissal": {
        "canonical": "الفصل التعسفي",
        "labels": ["الطرد التعسفي", "الفصل الجائر", "الإقالة الظالمة", "الفصل بدون مبرر"],
        "related": ["unjust_termination", "termination_compensation"],
        "laws": ["المادة 77", "المادة 78"],
        "court": "labor",
    },
    "notice_period": {
        "canonical": "الإشعار القانوني قبل الإنهاء",
        "labels": ["مهلة الإشعار", "الإخطار", "مدة الإشعار", "التنبيه قبل الإنهاء", "الإخطار القانوني"],
        "related": ["unjust_termination", "termination_compensation"],
        "laws": ["المادة 75", "المادة 76"],
        "court": "labor",
    },
    "end_of_service": {
        "canonical": "مكافأة نهاية الخدمة",
        "labels": ["مكافأة نهاية العقد", "مكافأة الترك", "بدل نهاية الخدمة", "مكافأة انتهاء العلاقة العمالية"],
        "related": ["termination_compensation", "unpaid_wages"],
        "laws": ["المادة 84", "المادة 85"],
        "court": "labor",
    },
    "unpaid_wages": {
        "canonical": "المطالبة بالأجور",
        "labels": ["الراتب غير المدفوع", "مستحقات العامل", "الأجور المتأخرة", "المطالبة بالراتب",
                   "سداد الأجور", "البدلات المتأخرة"],
        "related": ["overtime", "leave_pay", "end_of_service"],
        "laws": ["المادة 90", "المادة 107"],
        "court": "labor",
    },
    "overtime": {
        "canonical": "أجر العمل الإضافي",
        "labels": ["العمل الإضافي", "الساعات الإضافية", "بدل الوقت الإضافي", "أجر العمل خارج الدوام"],
        "related": ["unpaid_wages"],
        "laws": ["المادة 107", "المادة 108"],
        "court": "labor",
    },
    "work_injury_compensation": {
        "canonical": "التعويض عن إصابة العمل",
        "labels": ["إصابات العمل", "حادث العمل", "التعويض عن الإصابة", "العجز الناتج عن العمل"],
        "related": ["unpaid_wages"],
        "laws": ["المادة 142", "المادة 143"],
        "court": "labor",
    },
    "non_compete": {
        "canonical": "شرط عدم المنافسة",
        "labels": ["اتفاقية عدم المنافسة", "شرع المنافسة بعد ترك العمل", "حظر المنافسة"],
        "related": ["work_contract_terms"],
        "laws": ["المادة 81"],
        "court": "labor",
    },

    # --- COMMERCIAL ---
    "partner_withdrawal": {
        "canonical": "انسحاب الشريك من الشركة",
        "labels": ["سحب الحصة", "انسحاب من الشراكة", "تنحي الشريك", "خروج الشريك",
                   "استرداد الحصة", "سحب حصته من الشركة"],
        "related": ["partnership_liquidation", "partner_disputes"],
        "laws": ["نظام الشركات"],
        "court": "commercial",
    },
    "partnership_liquidation": {
        "canonical": "تصفية الشركة",
        "labels": ["حل الشركة", "تصفية الشراكة", "تقسيم أموال الشركة", "التصفية", "حل وتصفية الشركة"],
        "related": ["partner_withdrawal", "partner_disputes"],
        "laws": ["نظام الشركات"],
        "court": "commercial",
    },
    "partner_disputes": {
        "canonical": "نزاعات الشركاء",
        "labels": ["خلاف الشركاء", "منازعة الشريك", "الخلاف بين الشركاء", "نزاع الشراكة"],
        "related": ["partner_withdrawal", "partnership_liquidation"],
        "laws": ["نظام الشركات"],
        "court": "commercial",
    },
    "contract_breach": {
        "canonical": "الإخلال بالعقد",
        "labels": ["عدم تنفيذ العقد", "المخالفة العقدية", "الإخلال بالالتزامات", "عدم الالتزام بالعقد",
                   "نكول عن العقد"],
        "related": ["penalty_clause", "contract_termination", "damages"],
        "laws": ["المادة 107 من نظام المعاملات المدنية"],
        "court": "commercial",
    },
    "penalty_clause": {
        "canonical": "الشرط الجزائي",
        "labels": ["الشرط الجزائي في العقد", "الغرامة الاتفاقية", "الجزاء الاتفاقي", "تعويض الاتفاق المسبق"],
        "related": ["contract_breach", "damages"],
        "laws": ["المادة 115 من نظام المعاملات المدنية"],
        "court": "commercial",
    },
    "bounced_cheque": {
        "canonical": "الشيك بدون رصيد",
        "labels": ["الشيك المرتجع", "شيك لا مقابل له", "الشيك الوهمي", "عدم وجود رصيد",
                   "الشيك بدون مؤونة"],
        "related": ["debt_claim", "commercial_note"],
        "laws": ["نظام الأوراق التجارية"],
        "court": "commercial",
    },
    "trademark_dispute": {
        "canonical": "منازعة العلامة التجارية",
        "labels": ["التقليد", "العلامة المسجلة", "انتهاك العلامة", "تشابه العلامات", "التعدي على العلامة التجارية"],
        "related": ["trademark_registration", "trademark_similarity"],
        "laws": ["نظام العلامات التجارية"],
        "court": "commercial",
    },

    # --- PERSONAL STATUS ---
    "divorce": {
        "canonical": "دعوى الطلاق",
        "labels": ["التطليق", "فسخ النكاح", "إنهاء الزواج", "الفراق", "طلب الطلاق"],
        "related": ["khul", "alimony", "custody", "mutaa"],
        "laws": ["المادة 99 من نظام الأحوال الشخصية"],
        "court": "personal_status",
    },
    "khul": {
        "canonical": "دعوى الخلع",
        "labels": ["المخالعة", "الخلع مقابل العوض", "طلب المخالعة"],
        "related": ["divorce", "dowry"],
        "laws": ["المادة 105"],
        "court": "personal_status",
    },
    "custody": {
        "canonical": "الحضانة",
        "labels": ["حضانة الأطفال", "حضانة الأولاد", "الحاضن", "مصلحة المحضون", "طلب الحضانة",
                   "انتقال الحضانة"],
        "related": ["visitation", "divorce"],
        "laws": ["المادة 154", "المادة 155 من نظام الأحوال الشخصية"],
        "court": "personal_status",
    },
    "alimony": {
        "canonical": "النفقة",
        "labels": ["نفقة الزوجة", "النفقة الشرعية", "طلب النفقة", "مقدار النفقة", "ترتيب النفقة"],
        "related": ["divorce", "nafaqa_children"],
        "laws": ["المادة 130", "المادة 131"],
        "court": "personal_status",
    },
    "estate_division": {
        "canonical": "قسمة التركة",
        "labels": ["تقسيم الميراث", "قسم الميراث", "الحصص الإرثية", "توزيع التركة", "التركه"],
        "related": ["will_bequest", "heir_determination"],
        "laws": ["نظام الميراث"],
        "court": "personal_status",
    },

    # --- GENERAL / CIVIL / CRIMINAL ---
    "fraud": {
        "canonical": "جريمة الاحتيال",
        "labels": ["النصب", "الاحتيال المالي", "الاستيلاء على المال", "التدليس", "الخداع"],
        "related": ["breach_of_trust"],
        "laws": ["نظام مكافحة الاحتيال"],
        "court": "general",
    },
    "forgery": {
        "canonical": "جريمة التزوير",
        "labels": ["تزوير محرر رسمي", "التزوير في المحررات", "محرر مزور", "اصطناع مستند"],
        "related": ["fraud"],
        "laws": ["نظام مكافحة التزوير"],
        "court": "general",
    },
    "property_dispute": {
        "canonical": "منازعة الملكية العقارية",
        "labels": ["نزاع الملكية", "ملكية الأرض", "الحق العيني", "المطالبة بالعقار", "إثبات الملكية",
                   "الصك العقاري"],
        "related": ["lease_dispute"],
        "laws": ["نظام التسجيل العقاري"],
        "court": "general",
    },
    "lease_dispute": {
        "canonical": "منازعة الإيجار",
        "labels": ["الإخلاء", "فسخ عقد الإيجار", "بدل الإيجار المتأخر", "عقد الإيجار", "تملك المستأجر"],
        "related": ["property_dispute", "contract_breach"],
        "laws": ["نظام التأجير"],
        "court": "general",
    },
    "debt_claim": {
        "canonical": "دعوى المطالبة المالية",
        "labels": ["المطالبة بالدين", "سداد المبلغ", "المديونية", "طلب سداد الدين", "السند التنفيذي"],
        "related": ["bounced_cheque"],
        "laws": ["نظام التنفيذ"],
        "court": "general",
    },
}

# Build label -> concept index for fast lookup
_LABEL_INDEX: dict[str, list[str]] = {}
for _cid, _c in CONCEPTS.items():
    _LABEL_INDEX[_c["canonical"]] = _LABEL_INDEX.get(_c["canonical"], []) + [_cid]
    for _label in _c["labels"]:
        _LABEL_INDEX[_label] = _LABEL_INDEX.get(_label, []) + [_cid]


def _normalize(text: str) -> str:
    """Arabic normalization for KB matching: diacritics, hamza, taa marbuta,
    and strips definite article 'ال' so 'الشيك' matches 'شيك'."""
    import re
    text = re.sub(r'[\u064B-\u065F\u0670\u0640]', '', text)
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    text = text.replace('ى', 'ي').replace('ؤ', 'و').replace('ئ', 'ي').replace('ة', 'ه')
    # Strip definite article "ال" from words > 3 chars for flexible matching
    words = text.split()
    words = [w[2:] if w.startswith('ال') and len(w) > 3 else w for w in words]
    return ' '.join(words).strip()


# Build normalized index
_NORM_LABEL_INDEX: dict[str, list[str]] = {}
for _label, _cids in _LABEL_INDEX.items():
    _norm = _normalize(_label)
    _NORM_LABEL_INDEX[_norm] = list(set(_NORM_LABEL_INDEX.get(_norm, []) + _cids))


def detect_concepts(query: str) -> list[str]:
    """Detect KB concepts present in the user query.
    Returns list of concept IDs whose canonical term or labels appear in query."""
    normalized_query = _normalize(query)
    found = set()

    for label, concept_ids in _NORM_LABEL_INDEX.items():
        # Labels in _NORM_LABEL_INDEX are already normalized — no need to re-normalize
        if len(label) >= 3 and label in normalized_query:
            found.update(concept_ids)

    return list(found)


def get_related_concepts(concept_id: str) -> list[str]:
    """Get concept IDs related to the given concept (graph edges)."""
    c = CONCEPTS.get(concept_id)
    return c["related"] if c else []


def get_concept_labels(concept_id: str) -> list[str]:
    """Get canonical + alternative labels for a concept."""
    c = CONCEPTS.get(concept_id)
    if not c:
        return []
    return [c["canonical"]] + c["labels"]


def get_concept_court(concept_id: str) -> str | None:
    """Get court type for a concept."""
    c = CONCEPTS.get(concept_id)
    return c.get("court") if c else None


def get_concept_laws(concept_id: str) -> list[str]:
    """Get law article references for a concept."""
    c = CONCEPTS.get(concept_id)
    return c.get("laws", []) if c else []


def enrich_query_with_kb(query: str, max_expansion: int = 15) -> tuple[str, list[str]]:
    """Enrich query with KB synonyms and related concepts.

    Returns (enriched_query, matched_concept_ids).
    The enriched query includes alternative labels and related concepts
    to improve semantic matching against judgment texts.
    """
    labels, concepts = get_kb_expansions(query, max_expansion)
    if not labels:
        return query, []
    enriched = query + " " + " ".join(labels)
    return enriched, concepts


def get_kb_expansions(query: str, max_expansion: int = 15) -> tuple[list[str], list[str]]:
    """Get KB labels and related concepts to append to a query.

    Returns (labels_to_add, matched_concept_ids).
    Labels are alternative terms + related concept canonical names
    for the concepts detected in the query.
    """
    concepts = detect_concepts(query)
    if not concepts:
        return [], []

    all_labels: list[str] = []
    seen = set(query.split())

    for cid in concepts:
        c = CONCEPTS[cid]
        for label in [c["canonical"]] + c["labels"][:3]:  # top 3 labels
            if label not in seen and len(all_labels) < max_expansion:
                all_labels.append(label)
                seen.add(label)

    # Related concept canonical terms (graph traversal, depth 1)
    for cid in concepts:
        for rid in get_related_concepts(cid):
            rc = CONCEPTS.get(rid)
            if rc and rc["canonical"] not in seen and len(all_labels) < max_expansion:
                all_labels.append(rc["canonical"])
                seen.add(rc["canonical"])

    return all_labels, concepts


def get_stats() -> dict:
    """KB statistics for debugging."""
    total_labels = sum(1 + len(c["labels"]) for c in CONCEPTS.values())
    return {
        "concepts": len(CONCEPTS),
        "labels_total": total_labels,
        "court_types": list(TAXONOMY.keys()),
        "subcategories": sum(len(t["subcategories"]) for t in TAXONOMY.values()),
    }
