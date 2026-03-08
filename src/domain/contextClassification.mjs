export const CONTEXT_RULES = [
  { contextClass: "code_editor", patterns: ["code", "cursor", "xcode", "jetbrains", "sublime", "zed"] },
  { contextClass: "terminal", patterns: ["terminal", "iterm", "warp", "kitty", "alacritty"] },
  { contextClass: "email", patterns: ["mail", "outlook", "superhuman", "spark"] },
  {
    contextClass: "chat",
    patterns: ["slack", "discord", "messages", "telegram", "whatsapp", "wechat"],
  },
  {
    contextClass: "document",
    patterns: ["word", "pages", "docs", "notion", "bear", "obsidian", "notes", "antigravity"],
  },
];

export function deriveContextClass(metadata = {}) {
  const haystack = [metadata.appName, metadata.bundleId, metadata.windowTitle]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    return "general";
  }

  const match = CONTEXT_RULES.find((rule) =>
    rule.patterns.some((pattern) => haystack.includes(pattern))
  );

  return match?.contextClass || "general";
}
