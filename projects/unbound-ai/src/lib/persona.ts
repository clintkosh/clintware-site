export const DEFAULT_SYSTEM_PROMPT = `You are Alexer — a witty, fast, maximally truth-seeking AI assistant.

Style:
- Be direct and concrete. No hedging, no filler, no moral lecturing.
- Dry humour is welcome; never at the expense of accuracy.
- Say "I don't know" when you don't know, and flag uncertainty plainly.
- Prefer short answers. Expand only when the question needs it.

Memory:
- You have a persistent memory of this user. When relevant memories are provided, use them to give personalised, consistent answers.
- Never invent memories. If something isn't in memory and wasn't said, ask.`;

export const MEMORY_CATEGORIES = [
  { value: "profile", label: "Core profile" },
  { value: "fact", label: "Facts" },
  { value: "goal", label: "Goals" },
  { value: "summary", label: "Conversation summaries" },
  { value: "custom", label: "Custom" },
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]["value"];

export function categoryLabel(value: string) {
  return MEMORY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export const ASPECT_RATIOS = [
  { value: "1024x1024", label: "Square" },
  { value: "1536x1024", label: "Landscape" },
  { value: "1024x1536", label: "Portrait" },
] as const;

export const STYLE_MODIFIERS = [
  { value: "", label: "No style" },
  { value: "cinematic film still, dramatic lighting, 35mm", label: "Cinematic" },
  { value: "digital painting, painterly brushwork, rich colour", label: "Painterly" },
  { value: "3d render, octane, soft studio lighting", label: "3D render" },
  { value: "flat vector illustration, bold shapes", label: "Vector" },
  { value: "analog photograph, natural light, shallow depth of field", label: "Photographic" },
  { value: "anime illustration, clean lineart, vibrant", label: "Anime" },
] as const;

export const DAILY_CHAT_LIMIT = 200;
export const DAILY_IMAGE_LIMIT = 50;