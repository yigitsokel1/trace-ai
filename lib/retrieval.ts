import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { PolicyDocument, RetrievalResult, WorkflowPreset } from "./types";

type Sql = NeonQueryFunction<false, false>;

const PRESET_DOC_BOOSTS: Record<WorkflowPreset, string[]> = {
  refund: ["refund_policy", "billing_faq"],
  billing: ["billing_faq"],
  login: ["login_help"],
  subscription: ["subscription_terms", "billing_faq"],
};

const SNIPPET_MAX_LEN = 160;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function addKeyword(keywords: string[], token: string) {
  if (!keywords.includes(token)) {
    keywords.push(token);
  }
}

function tagMatchesToken(tag: string, token: string): boolean {
  return tag.includes(token) || token.includes(tag);
}

export function extractSnippet(
  content: string,
  tokens: string[],
  maxLen = SNIPPET_MAX_LEN
): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const contentLower = normalized.toLowerCase();
  let matchIndex = -1;

  for (const token of tokens) {
    const idx = contentLower.indexOf(token);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }

  if (matchIndex === -1) {
    const lines = normalized.split("\n").map((l) => l.trim());
    const firstLine =
      lines.find((line) => line.length > 0 && !line.startsWith("#")) ??
      lines.find((line) => line.length > 0) ??
      normalized;
    const excerpt = firstLine.slice(0, maxLen);
    return excerpt.length < firstLine.length ? `${excerpt}…` : excerpt;
  }

  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, matchIndex - half);
  const end = Math.min(normalized.length, start + maxLen);
  const excerpt = normalized.slice(start, end).trim();

  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${excerpt}${suffix}`;
}

export type RetrievePolicyDocumentsOptions = {
  preset?: WorkflowPreset;
  maxDocs?: number;
};

export type RetrievalEnrichment = Pick<
  RetrievalResult,
  "matched_keywords" | "snippets"
>;

export function pickRetrievalEnrichment(
  result: RetrievalResult,
  docIds: string[]
): RetrievalEnrichment {
  const matched_keywords: Record<string, string[]> = {};
  const snippets: Record<string, string> = {};

  for (const docId of docIds) {
    const keywords = result.matched_keywords?.[docId];
    if (keywords?.length) {
      matched_keywords[docId] = keywords;
    }
    const snippet = result.snippets?.[docId];
    if (snippet) {
      snippets[docId] = snippet;
    }
  }

  return {
    matched_keywords:
      Object.keys(matched_keywords).length > 0 ? matched_keywords : undefined,
    snippets: Object.keys(snippets).length > 0 ? snippets : undefined,
  };
}

export async function retrievePolicyDocuments(
  sql: Sql,
  input: string,
  options: RetrievePolicyDocumentsOptions = {}
): Promise<RetrievalResult> {
  const maxDocs = Math.min(Math.max(options.maxDocs ?? 3, 1), 3);
  const boostDocIds = options.preset ? PRESET_DOC_BOOSTS[options.preset] : [];

  const rows = await sql`
    SELECT doc_id, tags, content FROM policy_documents
  `;
  const docs = rows as Pick<PolicyDocument, "doc_id" | "tags" | "content">[];
  const tokens = tokenize(input);
  const scores: Record<string, number> = {};
  const matchedByDoc: Record<string, string[]> = {};

  for (const doc of docs) {
    let score = 0;
    const contentLower = doc.content.toLowerCase();
    const docKeywords: string[] = [];
    matchedByDoc[doc.doc_id] = docKeywords;

    if (boostDocIds.includes(doc.doc_id)) {
      score += 0.25;
    }

    for (const token of tokens) {
      const tagHit = doc.tags.some((tag) => tagMatchesToken(tag, token));
      const contentHit = contentLower.includes(token);

      if (tagHit || contentHit) {
        addKeyword(docKeywords, token);
      }
      if (tagHit) {
        score += 0.35;
      }
      if (contentHit) {
        score += 0.15;
      }
    }

    if (score > 0) {
      scores[doc.doc_id] = Math.min(Number(score.toFixed(2)), 0.99);
    } else {
      delete matchedByDoc[doc.doc_id];
    }
  }

  let ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    let bestId = docs[0]?.doc_id ?? "refund_policy";
    let bestScore = 0;
    const fallbackKeywords: string[] = [];

    for (const doc of docs) {
      const overlapTokens = tokens.filter((t) =>
        doc.tags.some((tag) => tagMatchesToken(tag, t))
      );
      if (overlapTokens.length > bestScore) {
        bestScore = overlapTokens.length;
        bestId = doc.doc_id;
        fallbackKeywords.length = 0;
        for (const t of overlapTokens) {
          addKeyword(fallbackKeywords, t);
        }
      }
    }

    if (fallbackKeywords.length === 0 && tokens.length > 0) {
      addKeyword(fallbackKeywords, tokens[0]!);
    }

    const bestDoc = docs.find((d) => d.doc_id === bestId);
    if (bestDoc) {
      matchedByDoc[bestId] = fallbackKeywords;
    }
    ranked = [[bestId, 0.45]];
  }

  const top = ranked.slice(0, maxDocs);
  const retrieved_docs = top.map(([id]) => id);
  const retrieval_scores = Object.fromEntries(top);

  const matched_keywords: Record<string, string[]> = {};
  const snippets: Record<string, string> = {};

  for (const docId of retrieved_docs) {
    const doc = docs.find((d) => d.doc_id === docId);
    if (!doc) continue;

    const keywords = matchedByDoc[docId] ?? [];
    if (keywords.length > 0) {
      matched_keywords[docId] = keywords;
    }
    snippets[docId] = extractSnippet(doc.content, keywords.length > 0 ? keywords : tokens);
  }

  return {
    retrieved_docs,
    retrieval_scores,
    matched_keywords:
      Object.keys(matched_keywords).length > 0 ? matched_keywords : undefined,
    snippets: Object.keys(snippets).length > 0 ? snippets : undefined,
  };
}
