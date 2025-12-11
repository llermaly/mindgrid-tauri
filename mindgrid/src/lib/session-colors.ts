/**
 * Generates a consistent color for a session based on its ID.
 * Returns a subtle color that can be used as an accent.
 */
export function getSessionColor(sessionId: string): {
  border: string;
  bg: string;
  bgHover: string;
  text: string;
} {
  // Hash the session ID to get a number
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Use hash to select from predefined color palette - distinct, vibrant colors
  const colors = [
    { hue: 210, sat: 70, name: 'blue' },        // Blue
    { hue: 280, sat: 65, name: 'purple' },      // Purple
    { hue: 150, sat: 60, name: 'green' },       // Green
    { hue: 340, sat: 70, name: 'pink' },        // Pink
    { hue: 25, sat: 75, name: 'orange' },       // Orange
    { hue: 180, sat: 65, name: 'cyan' },        // Cyan
    { hue: 45, sat: 70, name: 'yellow' },       // Yellow/Gold
    { hue: 300, sat: 65, name: 'magenta' },     // Magenta
    { hue: 0, sat: 70, name: 'red' },           // Red
    { hue: 120, sat: 60, name: 'lime' },        // Lime
    { hue: 260, sat: 65, name: 'violet' },      // Violet
    { hue: 190, sat: 60, name: 'teal' },        // Teal
    { hue: 15, sat: 75, name: 'coral' },        // Coral
    { hue: 170, sat: 70, name: 'turquoise' },   // Turquoise
    { hue: 320, sat: 70, name: 'fuchsia' },     // Fuchsia
    { hue: 55, sat: 65, name: 'amber' },        // Amber
    { hue: 240, sat: 70, name: 'indigo' },      // Indigo
    { hue: 140, sat: 55, name: 'emerald' },     // Emerald
    { hue: 200, sat: 70, name: 'sky' },         // Sky Blue
    { hue: 290, sat: 60, name: 'orchid' },      // Orchid
    { hue: 35, sat: 80, name: 'tangerine' },    // Tangerine
    { hue: 160, sat: 65, name: 'mint' },        // Mint
    { hue: 350, sat: 75, name: 'rose' },        // Rose
    { hue: 220, sat: 65, name: 'sapphire' },    // Sapphire
  ];

  const colorIndex = Math.abs(hash) % colors.length;
  const { hue, sat } = colors[colorIndex];

  return {
    border: `hsl(${hue}, ${sat}%, 55%)`,      // Border color - vibrant and visible
    bg: `hsl(${hue}, ${sat - 20}%, 15%)`,     // Background tint - subtle
    bgHover: `hsl(${hue}, ${sat - 15}%, 20%)`, // Hover state
    text: `hsl(${hue}, ${sat}%, 70%)`,        // Text accent color
  };
}

/**
 * Get session color CSS variables for use in styles
 */
export function getSessionColorVars(sessionId: string): Record<string, string> {
  const colors = getSessionColor(sessionId);
  return {
    '--session-border': colors.border,
    '--session-bg': colors.bg,
    '--session-bg-hover': colors.bgHover,
    '--session-text': colors.text,
  };
}
