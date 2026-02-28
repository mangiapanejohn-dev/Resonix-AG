/**
 * In-memory sliding-window rate limiter for gateway authentication attempts.
 *
 * Tracks failed auth attempts by {scope, clientIp}. A scope lets callers keep
 * independent counters for different credential classes (for example, shared
 * gateway token/password vs device-token auth) while still sharing one
 * limiter instance.
 *
 * Design decisions:
 * - Pure in-memory Map – no external dependencies; suitable for a single
 *   gateway process.  The Map is periodically pruned to avoid unbounded
 *   growth.
 * - Loopback addresses (127.0.0.1 / ::1) are exempt by default so that local
 *   CLI sessions are never locked out.
 * - The module is side-effect-free: callers create an instance via
 *   {@link createAuthRateLimiter} and pass it where needed.
 */

import { isLoopbackAddress } from "./net.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum failed attempts before blocking.  @default 10 */
  maxAttempts?: number;
  /** Sliding window duration in milliseconds.     @default 60_000 (1 min) */
  windowMs?: number;
  /** Lockout duration in milliseconds after the limit is exceeded.  @default 300_000 (5 min) */
  lockoutMs?: number;
  /** Exempt loopback (localhost) addresses from rate limiting.  @default true */
  exemptLoopback?: boolean;
  /** Exempt list of IP addresses from rate limiting. */
  exemptIps?: string[];
  /** Enable detailed metrics and monitoring. */
  enableMetrics?: boolean;
  /** Prune interval in milliseconds.  @default 60_000 (1 min) */
  pruneIntervalMs?: number;
}

export const AUTH_RATE_LIMIT_SCOPE_DEFAULT = "default";
export const AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET = "shared-secret";
export const AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN = "device-token";

export interface RateLimitEntry {
  /** Timestamps (epoch ms) of recent failed attempts inside the window. */
  attempts: number[];
  /** If set, requests from this IP are blocked until this epoch-ms instant. */
  lockedUntil?: number;
  /** First seen timestamp (epoch ms). */
  firstSeenMs: number;
  /** Last seen timestamp (epoch ms). */
  lastSeenMs: number;
}

export interface RateLimitCheckResult {
  /** Whether the request is allowed to proceed. */
  allowed: boolean;
  /** Number of remaining attempts before the limit is reached. */
  remaining: number;
  /** Milliseconds until the lockout expires (0 when not locked). */
  retryAfterMs: number;
  /** Current number of attempts in the window. */
  currentAttempts: number;
  /** Whether the IP is exempt from rate limiting. */
  exempt: boolean;
}

export interface AuthRateLimiterMetrics {
  /** Total number of check requests. */
  totalChecks: number;
  /** Number of allowed requests. */
  allowedChecks: number;
  /** Number of blocked requests. */
  blockedChecks: number;
  /** Number of failed attempts recorded. */
  totalFailures: number;
  /** Number of resets performed. */
  totalResets: number;
  /** Current number of tracked entries. */
  currentEntries: number;
  /** Number of exempted requests. */
  exemptedChecks: number;
}

export interface AuthRateLimiter {
  /** Check whether `ip` is currently allowed to attempt authentication. */
  check(ip: string | undefined, scope?: string): RateLimitCheckResult;
  /** Record a failed authentication attempt for `ip`. */
  recordFailure(ip: string | undefined, scope?: string): void;
  /** Reset the rate-limit state for `ip` (e.g. after a successful login). */
  reset(ip: string | undefined, scope?: string): void;
  /** Return the current number of tracked IPs (useful for diagnostics). */
  size(): number;
  /** Remove expired entries and release memory. */
  prune(): void;
  /** Dispose the limiter and cancel periodic cleanup timers. */
  dispose(): void;
  /** Get metrics for the rate limiter. */
  getMetrics(): AuthRateLimiterMetrics;
  /** Clear all rate limit entries. */
  clear(): void;
  /** Get all rate limit entries (for debugging). */
  getEntries(): Map<string, RateLimitEntry>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_LOCKOUT_MS = 300_000; // 5 minutes
const DEFAULT_PRUNE_INTERVAL_MS = 60_000; // prune stale entries every minute

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createAuthRateLimiter(config?: RateLimitConfig): AuthRateLimiter {
  const maxAttempts = config?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS;
  const lockoutMs = config?.lockoutMs ?? DEFAULT_LOCKOUT_MS;
  const exemptLoopback = config?.exemptLoopback ?? true;
  const exemptIps = config?.exemptIps ?? [];
  const enableMetrics = config?.enableMetrics ?? false;
  const pruneIntervalMs = config?.pruneIntervalMs ?? DEFAULT_PRUNE_INTERVAL_MS;

  const entries = new Map<string, RateLimitEntry>();

  // Metrics tracking
  const metrics = {
    totalChecks: 0,
    allowedChecks: 0,
    blockedChecks: 0,
    totalFailures: 0,
    totalResets: 0,
    currentEntries: 0,
    exemptedChecks: 0,
  };

  // Periodic cleanup to avoid unbounded map growth.
  const pruneTimer = setInterval(() => prune(), pruneIntervalMs);
  // Allow the Node.js process to exit even if the timer is still active.
  if (pruneTimer.unref) {
    pruneTimer.unref();
  }

  function normalizeScope(scope: string | undefined): string {
    return (scope ?? AUTH_RATE_LIMIT_SCOPE_DEFAULT).trim() || AUTH_RATE_LIMIT_SCOPE_DEFAULT;
  }

  function normalizeIp(ip: string | undefined): string {
    return (ip ?? "").trim() || "unknown";
  }

  function resolveKey(
    rawIp: string | undefined,
    rawScope: string | undefined,
  ): {
    key: string;
    ip: string;
  } {
    const ip = normalizeIp(rawIp);
    const scope = normalizeScope(rawScope);
    return { key: `${scope}:${ip}`, ip };
  }

  function isExempt(ip: string): boolean {
    if (exemptLoopback && isLoopbackAddress(ip)) {
      return true;
    }
    return exemptIps.includes(ip);
  }

  function slideWindow(entry: RateLimitEntry, now: number): void {
    const cutoff = now - windowMs;
    // Remove attempts that fell outside the window.
    entry.attempts = entry.attempts.filter((ts) => ts > cutoff);
  }

  function check(rawIp: string | undefined, rawScope?: string): RateLimitCheckResult {
    const { key, ip } = resolveKey(rawIp, rawScope);
    const exempt = isExempt(ip);

    if (enableMetrics) {
      metrics.totalChecks++;
    }

    if (exempt) {
      if (enableMetrics) {
        metrics.exemptedChecks++;
        metrics.allowedChecks++;
      }
      return {
        allowed: true,
        remaining: maxAttempts,
        retryAfterMs: 0,
        currentAttempts: 0,
        exempt: true,
      };
    }

    const now = Date.now();
    const entry = entries.get(key);

    if (!entry) {
      if (enableMetrics) {
        metrics.allowedChecks++;
      }
      return {
        allowed: true,
        remaining: maxAttempts,
        retryAfterMs: 0,
        currentAttempts: 0,
        exempt: false,
      };
    }

    // Update last seen timestamp
    entry.lastSeenMs = now;

    // Still locked out?
    if (entry.lockedUntil && now < entry.lockedUntil) {
      if (enableMetrics) {
        metrics.blockedChecks++;
      }
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: entry.lockedUntil - now,
        currentAttempts: entry.attempts.length,
        exempt: false,
      };
    }

    // Lockout expired – clear it.
    if (entry.lockedUntil && now >= entry.lockedUntil) {
      entry.lockedUntil = undefined;
      entry.attempts = [];
    }

    slideWindow(entry, now);
    const currentAttempts = entry.attempts.length;
    const remaining = Math.max(0, maxAttempts - currentAttempts);
    const allowed = remaining > 0;

    if (enableMetrics) {
      if (allowed) {
        metrics.allowedChecks++;
      } else {
        metrics.blockedChecks++;
      }
    }

    return {
      allowed,
      remaining,
      retryAfterMs: 0,
      currentAttempts,
      exempt: false,
    };
  }

  function recordFailure(rawIp: string | undefined, rawScope?: string): void {
    const { key, ip } = resolveKey(rawIp, rawScope);
    if (isExempt(ip)) {
      return;
    }

    const now = Date.now();
    let entry = entries.get(key);

    if (!entry) {
      entry = {
        attempts: [],
        firstSeenMs: now,
        lastSeenMs: now,
      };
      entries.set(key, entry);
      if (enableMetrics) {
        metrics.currentEntries++;
      }
    } else {
      entry.lastSeenMs = now;
    }

    // If currently locked, do nothing (already blocked).
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return;
    }

    slideWindow(entry, now);
    entry.attempts.push(now);

    if (enableMetrics) {
      metrics.totalFailures++;
    }

    if (entry.attempts.length >= maxAttempts) {
      entry.lockedUntil = now + lockoutMs;
    }
  }

  function reset(rawIp: string | undefined, rawScope?: string): void {
    const { key } = resolveKey(rawIp, rawScope);
    const existed = entries.delete(key);
    if (existed && enableMetrics) {
      metrics.totalResets++;
      metrics.currentEntries--;
    }
  }

  function prune(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of entries) {
      // If locked out, keep the entry until the lockout expires.
      if (entry.lockedUntil && now < entry.lockedUntil) {
        continue;
      }
      slideWindow(entry, now);
      if (entry.attempts.length === 0) {
        entries.delete(key);
        removed++;
      }
    }

    if (removed > 0 && enableMetrics) {
      metrics.currentEntries -= removed;
    }
  }

  function size(): number {
    return entries.size;
  }

  function dispose(): void {
    clearInterval(pruneTimer);
    entries.clear();
    if (enableMetrics) {
      Object.keys(metrics).forEach((key) => {
        (metrics as any)[key] = 0;
      });
    }
  }

  function getMetrics(): AuthRateLimiterMetrics {
    if (enableMetrics) {
      return {
        ...metrics,
        currentEntries: entries.size,
      };
    }
    return {
      totalChecks: 0,
      allowedChecks: 0,
      blockedChecks: 0,
      totalFailures: 0,
      totalResets: 0,
      currentEntries: entries.size,
      exemptedChecks: 0,
    };
  }

  function clear(): void {
    const count = entries.size;
    entries.clear();
    if (enableMetrics) {
      metrics.currentEntries = 0;
    }
  }

  function getEntries(): Map<string, RateLimitEntry> {
    return new Map(entries);
  }

  return {
    check,
    recordFailure,
    reset,
    size,
    prune,
    dispose,
    getMetrics,
    clear,
    getEntries,
  };
}
