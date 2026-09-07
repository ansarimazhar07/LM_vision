import { type Rule, validateRuleLifecycle } from '@lm-vision/shared-types';
import { AUTHORITATIVE_GSR202E_RULES } from './authoritative-rules.js';
import {
  type RuleBundleManifest,
  AUTHORITATIVE_RULE_BUNDLE_MANIFEST,
  BUNDLE_CHECKSUM_SHA256,
} from './manifest.js';

export interface LoadedRuleBundle {
  readonly manifest: RuleBundleManifest;
  readonly rules: readonly Rule[];
  readonly loadedAt: string;
}

/**
 * In-memory cache of verified rules for instantaneous sub-millisecond evaluation.
 */
let cachedBundle: LoadedRuleBundle | null = null;

/**
 * Validates and loads the authoritative GSR 202(E) 2011 rule bundle.
 * 
 * Strict safety guarantees:
 * 1. ZERO network calls (100% offline).
 * 2. Strict lifecycle validation: every rule must pass validateRuleLifecycle().
 * 3. Enforces ruleKind: 'AUTHORITATIVE' and sourceStatus: 'VERIFIED'.
 * 4. Verifies bundle manifest checksum and rule count.
 */
export function loadAuthoritativeRuleBundle(): LoadedRuleBundle {
  if (cachedBundle) {
    return cachedBundle;
  }

  // 1. Verify bundle manifest checksum
  if (AUTHORITATIVE_RULE_BUNDLE_MANIFEST.contentChecksum !== BUNDLE_CHECKSUM_SHA256) {
    throw new Error(
      `Bundle integrity violation: manifest checksum mismatch for bundle ${AUTHORITATIVE_RULE_BUNDLE_MANIFEST.bundleId}`
    );
  }

  // 2. Validate count
  if (AUTHORITATIVE_GSR202E_RULES.length !== AUTHORITATIVE_RULE_BUNDLE_MANIFEST.ruleCount) {
    throw new Error(
      `Bundle integrity violation: expected ${AUTHORITATIVE_RULE_BUNDLE_MANIFEST.ruleCount} rules, found ${AUTHORITATIVE_GSR202E_RULES.length}`
    );
  }

  // 3. Strict lifecycle validation for every rule
  for (const rule of AUTHORITATIVE_GSR202E_RULES) {
    validateRuleLifecycle(rule);

    if (rule.ruleKind !== 'AUTHORITATIVE') {
      throw new Error(
        `Authoritative bundle rule ${rule.ruleId} must have ruleKind 'AUTHORITATIVE', got '${rule.ruleKind}'`
      );
    }

    if (rule.sourceStatus !== 'VERIFIED') {
      throw new Error(
        `Authoritative bundle rule ${rule.ruleId} must have sourceStatus 'VERIFIED', got '${rule.sourceStatus}'`
      );
    }

    if (!rule.sourceMetadata?.sourcePage || !rule.sourceMetadata?.clauseReference) {
      throw new Error(
        `Authoritative rule ${rule.ruleId} is missing mandatory sourceMetadata (page or clause)`
      );
    }
  }

  cachedBundle = Object.freeze({
    manifest: Object.freeze({
      ...AUTHORITATIVE_RULE_BUNDLE_MANIFEST,
      loadedAt: new Date().toISOString(),
    }),
    rules: Object.freeze([...AUTHORITATIVE_GSR202E_RULES]),
    loadedAt: new Date().toISOString(),
  });

  return cachedBundle;
}

/**
 * Retrieves an authoritative rule by ID from the verified bundle.
 */
export function getAuthoritativeRule(ruleId: string): Rule | undefined {
  const bundle = loadAuthoritativeRuleBundle();
  return bundle.rules.find((r) => r.ruleId === ruleId);
}

/**
 * Returns all rules in the authoritative bundle.
 */
export function getAllAuthoritativeRules(): readonly Rule[] {
  const bundle = loadAuthoritativeRuleBundle();
  return bundle.rules;
}

/**
 * Explicit integrity check helper. Returns true if valid, false if tampered.
 */
export function verifyBundleIntegrity(): boolean {
  try {
    loadAuthoritativeRuleBundle();
    return true;
  } catch {
    return false;
  }
}
