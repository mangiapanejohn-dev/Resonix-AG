/**
 * Resonix FeiShu Targets
 *
 * Manages FeiShu message targets
 */

export interface FeiShuTarget {
  id: string;
  type: "chat_id" | "open_id" | "user_id";
  name?: string;
}

/**
 * Parse FeiShu target from string
 */
export function parseFeiShuTarget(target: string): FeiShuTarget {
  // Determine target type based on format
  if (target.startsWith("ou_")) {
    return {
      id: target,
      type: "open_id",
    };
  } else if (target.match(/^[a-zA-Z0-9]{1,32}$/)) {
    return {
      id: target,
      type: "user_id",
    };
  } else {
    // Default to chat_id
    return {
      id: target,
      type: "chat_id",
    };
  }
}

/**
 * Format FeiShu target for display
 */
export function formatFeiShuTarget(target: FeiShuTarget): string {
  return `${target.type}: ${target.id}${target.name ? ` (${target.name})` : ""}`;
}

/**
 * Validate FeiShu target format
 */
export function validateFeiShuTarget(target: string): boolean {
  // Check if target is a valid open_id, user_id, or chat_id
  return (
    target.startsWith("ou_") || // open_id
    !!target.match(/^[a-zA-Z0-9]{1,32}$/) || // user_id
    target.length > 0 // chat_id
  );
}
