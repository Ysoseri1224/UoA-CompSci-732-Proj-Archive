/** Maps backend / legacy Chinese boss labels to English UI copy. Ids and payloads unchanged. */
const ZH_TO_EN = {
  暗影领主: 'Shadow Lord',
};

const DEFAULT_DISPLAY = 'Shadow Lord';

/**
 * @param {string|null|undefined} raw
 * @returns {string}
 */
export function getBossDisplayName(raw) {
  if (raw == null) return DEFAULT_DISPLAY;
  const key = String(raw).trim();
  if (!key) return DEFAULT_DISPLAY;
  return ZH_TO_EN[key] ?? key;
}
