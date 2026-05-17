const MAX_PREVIEW_LENGTH = 200;
const DEFAULT_MAX_USER_CHARS = 80;

export function buildAiDraftInputPreview(
  retrievedDocs: string[],
  userInput: string,
  maxUserChars = DEFAULT_MAX_USER_CHARS
): string {
  const docsLabel =
    retrievedDocs.length > 0 ? retrievedDocs.join(", ") : "none";
  const userSnippet = userInput.trim().slice(0, maxUserChars);
  const preview = `docs: ${docsLabel} | ${userSnippet}`;

  return preview.slice(0, MAX_PREVIEW_LENGTH);
}
