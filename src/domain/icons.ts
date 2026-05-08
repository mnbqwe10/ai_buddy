export interface ActionIconDefinition {
  id: string;
  name: string;
  keywords: string[];
  svg: string;
}

export const fallbackActionIcons: ActionIconDefinition[] = [
  {
    id: "copy",
    name: "Copy",
    keywords: ["duplicate", "clipboard"],
    svg: '<path d="M8 8h10v12H8z"/><path d="M6 16H4V4h10v2"/>',
  },
  {
    id: "question-mark",
    name: "Question Mark",
    keywords: ["explain", "help", "learn"],
    svg: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 0 1 5 1.4c0 1.9-2.5 2.2-2.5 4"/><path d="M12 18h.01"/>',
  },
  {
    id: "language",
    name: "Language",
    keywords: ["translate", "global"],
    svg: '<path d="M4 5h9"/><path d="M8 3v2"/><path d="M5 12c2.7-1.3 4.4-3.7 5-7"/><path d="M11 12c-1.2-.8-2.3-2-3-3.5"/><path d="M13 21l5-11 5 11"/><path d="M15 17h6"/>',
  },
  {
    id: "list-details",
    name: "List Details",
    keywords: ["summarize", "shorten", "outline"],
    svg: '<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h8"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>',
  },
  {
    id: "message-circle-question",
    name: "Message Circle Question",
    keywords: ["ask", "chat", "question"],
    svg: '<path d="M5 6h14v9H8l-3 3z"/><path d="M9 10h6"/><path d="M9 13h4"/>',
  },
  {
    id: "message-reply",
    name: "Message Reply",
    keywords: ["email", "respond", "reply"],
    svg: '<path d="M10 8 5 13l5 5"/><path d="M5 13h8a6 6 0 0 1 6 6v1"/>',
  },
  {
    id: "sparkles",
    name: "Sparkles",
    keywords: ["polish", "improve", "write"],
    svg: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  },
  {
    id: "bulb",
    name: "Bulb",
    keywords: ["brainstorm", "idea", "creative"],
    svg: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a6 6 0 1 1 8 0c-1.2 1-1.5 2.1-1.5 3h-5c0-.9-.3-2-1.5-3z"/>',
  },
  {
    id: "chart-dots",
    name: "Chart Dots",
    keywords: ["visualize", "diagram", "image"],
    svg: '<rect x="4" y="5" width="7" height="7" rx="1"/><circle cx="17" cy="9" r="3"/><path d="m6 20 4-5 4 5 3-4 3 4z"/>',
  },
  {
    id: "tag",
    name: "Tag",
    keywords: ["name", "label", "title"],
    svg: '<path d="M4 6h9l7 7-7 7H4z"/><path d="M8 12h.01"/>',
  },
  {
    id: "wand",
    name: "Wand",
    keywords: ["prompt", "generate", "magic"],
    svg: '<path d="M4 20 18 6"/><path d="m14 6 4-2 2 4-2 2z"/><path d="M5 5h.01"/><path d="M12 3h.01"/><path d="M20 14h.01"/>',
  },
];

const fallbackActionIconById = new Map(fallbackActionIcons.map((icon) => [icon.id, icon]));

export function getFallbackActionIcon(iconId: string | undefined) {
  return iconId ? fallbackActionIconById.get(iconId) : undefined;
}
