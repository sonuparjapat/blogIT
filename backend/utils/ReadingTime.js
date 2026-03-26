/**
 * Recursively walk a TipTap / ProseMirror JSON document and
 * collect all text-node values into a single string.
 *
 * Much more accurate than JSON.stringify + regex stripping.
 *
 * @param {object} node  – TipTap JSON node
 * @returns {string}
 */
const extractText = (node) => {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return node.text || "";
 
  if (Array.isArray(node.content)) {
    return node.content.map(extractText).join(" ");
  }
  return "";
};
 
/**
 * @param {object|string} content  – TipTap JSON (object) or stringified JSON
 * @returns {number}               – estimated minutes, minimum 1
 */
const calcReadingTime = (content) => {
  try {
    const doc  = typeof content === "string" ? JSON.parse(content) : content;
    const text = extractText(doc);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  } catch {
    return 1;
  }
};
 
module.exports = { calcReadingTime, extractText };