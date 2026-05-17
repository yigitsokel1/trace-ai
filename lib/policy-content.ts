import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

const EXCERPT_MAX_CHARS = 700;

function truncateExcerpt(content: string): string {
  if (content.length <= EXCERPT_MAX_CHARS) return content;
  return `${content.slice(0, EXCERPT_MAX_CHARS)}…`;
}

export type PolicyExcerpt = {
  doc_id: string;
  content: string;
};

export async function getPolicyContentsByIds(
  sql: Sql,
  docIds: string[]
): Promise<PolicyExcerpt[]> {
  if (docIds.length === 0) return [];

  const rows = await sql`
    SELECT doc_id, content
    FROM policy_documents
    WHERE doc_id = ANY(${docIds})
  `;

  const byId = new Map(
    (rows as { doc_id: string; content: string }[]).map((row) => [
      row.doc_id,
      truncateExcerpt(row.content),
    ])
  );

  return docIds
    .filter((id) => byId.has(id))
    .map((doc_id) => ({ doc_id, content: byId.get(doc_id)! }));
}
