import type { NeonQueryFunction } from "@neondatabase/serverless";
import type { PolicyDocument, RetrievalResult, WorkflowPreset } from "./types";

type Sql = NeonQueryFunction<false, false>;

const PRESET_DOC_BOOSTS: Record<WorkflowPreset, string[]> = {
  refund: ["refund_policy", "billing_faq"],
  billing: ["billing_faq"],
  login: ["login_help"],
  subscription: ["subscription_terms", "billing_faq"],
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

export type RetrievePolicyDocumentsOptions = {
  preset?: WorkflowPreset;
  maxDocs?: number;
};

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

  for (const doc of docs) {
    let score = 0;
    const contentLower = doc.content.toLowerCase();

    if (boostDocIds.includes(doc.doc_id)) {
      score += 0.25;
    }

    for (const token of tokens) {
      if (doc.tags.some((tag) => tag.includes(token) || token.includes(tag))) {
        score += 0.35;
      }
      if (contentLower.includes(token)) {
        score += 0.15;
      }
    }

    if (score > 0) {
      scores[doc.doc_id] = Math.min(Number(score.toFixed(2)), 0.99);
    }
  }

  let ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    let bestId = docs[0]?.doc_id ?? "refund_policy";
    let bestScore = 0;
    for (const doc of docs) {
      const overlap = doc.tags.filter((tag) =>
        tokens.some((t) => tag.includes(t) || t.includes(tag))
      ).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestId = doc.doc_id;
      }
    }
    ranked = [[bestId, 0.45]];
  }

  const top = ranked.slice(0, maxDocs);
  return {
    retrieved_docs: top.map(([id]) => id),
    retrieval_scores: Object.fromEntries(top),
  };
}
