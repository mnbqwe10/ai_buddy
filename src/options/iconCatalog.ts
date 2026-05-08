import iconMetadata from "../../node_modules/@tabler/icons/icons.json";
import iconNodes from "../../node_modules/@tabler/icons/tabler-nodes-outline.json";
import type { ActionIconDefinition } from "../domain/icons";

type TablerNode = [string, Record<string, string | number>];

interface TablerMetadata {
  category?: string;
  tags?: Array<string | number>;
}

const preferredIconIds = [
  "copy",
  "question-mark",
  "language",
  "list-details",
  "message-circle-question",
  "message-reply",
  "sparkles",
  "bulb",
  "chart-dots",
  "tag",
  "wand",
  "mail",
  "pencil",
  "search",
  "chart-infographic",
  "photo",
  "palette",
  "notes",
  "message-chatbot",
  "check",
];

const preferredIconOrder = new Map(preferredIconIds.map((id, index) => [id, index]));

function titleizeIconId(id: string) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeAttribute(value: string | number) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function renderNode([tag, attributes]: TablerNode) {
  const attributeText = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(" ");

  return `<${tag} ${attributeText} />`;
}

const rawIconMetadata = iconMetadata as unknown as Record<string, TablerMetadata>;
const rawIconNodes = iconNodes as unknown as Record<string, TablerNode[]>;

export const tablerIconCatalog: ActionIconDefinition[] = Object.entries(rawIconNodes)
  .map(([id, nodes]) => {
    const metadata = rawIconMetadata[id] ?? {};
    const keywords = [metadata.category, ...(metadata.tags ?? []).map(String)]
      .filter((keyword): keyword is string => Boolean(keyword));

    return {
      id,
      name: titleizeIconId(id),
      keywords,
      svg: nodes.map(renderNode).join(""),
    };
  })
  .sort((first, second) => {
    const firstPreferred = preferredIconOrder.get(first.id);
    const secondPreferred = preferredIconOrder.get(second.id);

    if (firstPreferred !== undefined || secondPreferred !== undefined) {
      return (firstPreferred ?? Number.MAX_SAFE_INTEGER) - (secondPreferred ?? Number.MAX_SAFE_INTEGER);
    }

    return first.name.localeCompare(second.name);
  });

const tablerIconById = new Map(tablerIconCatalog.map((icon) => [icon.id, icon]));

export function getTablerIcon(iconId: string | undefined) {
  return iconId ? tablerIconById.get(iconId) : undefined;
}
