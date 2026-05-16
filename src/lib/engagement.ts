// Engagement Scoring Engine
// Computes contact engagement scores and tiers from message history

export type EngagementTier = 'vip' | 'active' | 'warm' | 'cold' | 'inactive'

export interface EngagementFactors {
  totalReceived:  number
  totalRead:      number
  totalReplied:   number
  daysSinceLastMsg: number
  campaignCount:  number
}

export interface EngagementResult {
  score: number        // 0–100
  tier:  EngagementTier
  label: string
  color: string
  description: string
}

const TIER_CONFIG: Record<EngagementTier, { label: string; color: string; description: string; min: number }> = {
  vip:      { label: 'VIP',      color: 'text-yellow-500',  description: 'Highly engaged, reads & replies consistently', min: 80 },
  active:   { label: 'Active',   color: 'text-green-500',   description: 'Regularly opens and reads messages',           min: 60 },
  warm:     { label: 'Warm',     color: 'text-blue-500',    description: 'Occasionally engages, needs nurturing',        min: 35 },
  cold:     { label: 'Cold',     color: 'text-muted-foreground', description: 'Rarely engages, low interaction',         min: 15 },
  inactive: { label: 'Inactive', color: 'text-red-500',     description: 'No engagement in 30+ days',                   min: 0  },
}

export function computeEngagementScore(factors: EngagementFactors): EngagementResult {
  const { totalReceived, totalRead, totalReplied, daysSinceLastMsg } = factors

  if (totalReceived === 0) {
    return { score: 0, tier: 'cold', ...pickTierMeta('cold') }
  }

  // Read rate (0-40 pts)
  const readRate   = totalRead / totalReceived
  const readPts    = readRate * 40

  // Reply rate (0-30 pts)
  const replyRate  = totalReplied / totalReceived
  const replyPts   = replyRate * 30

  // Recency bonus/penalty (0-20 pts)
  let recencyPts = 20
  if (daysSinceLastMsg > 90) recencyPts = 0
  else if (daysSinceLastMsg > 60) recencyPts = 5
  else if (daysSinceLastMsg > 30) recencyPts = 10
  else if (daysSinceLastMsg > 14) recencyPts = 15

  // Volume bonus (0-10 pts) — rewards active communicators
  const volumePts  = Math.min(totalReceived / 10, 1) * 10

  const score = Math.round(Math.min(100, readPts + replyPts + recencyPts + volumePts))

  let tier: EngagementTier
  if (daysSinceLastMsg > 60 && score < 30) tier = 'inactive'
  else if (score >= 80) tier = 'vip'
  else if (score >= 60) tier = 'active'
  else if (score >= 35) tier = 'warm'
  else if (daysSinceLastMsg > 45) tier = 'inactive'
  else tier = 'cold'

  return { score, tier, ...pickTierMeta(tier) }
}

function pickTierMeta(tier: EngagementTier) {
  const { label, color, description } = TIER_CONFIG[tier]
  return { label, color, description }
}

export function getTierConfig(tier: EngagementTier) {
  return TIER_CONFIG[tier]
}

export function getAllTiers(): { tier: EngagementTier; config: typeof TIER_CONFIG[EngagementTier] }[] {
  return (Object.keys(TIER_CONFIG) as EngagementTier[]).map(tier => ({ tier, config: TIER_CONFIG[tier] }))
}

// Compute workspace-level engagement segment distribution
export function computeSegmentDistribution(contacts: { engagementTier: string }[]) {
  const counts: Record<string, number> = { vip: 0, active: 0, warm: 0, cold: 0, inactive: 0 }
  for (const c of contacts) {
    const tier = c.engagementTier as EngagementTier
    if (counts[tier] !== undefined) counts[tier]++
  }
  const total = contacts.length || 1
  return Object.entries(counts).map(([tier, count]) => ({
    tier: tier as EngagementTier,
    count,
    pct: Math.round((count / total) * 100),
    ...pickTierMeta(tier as EngagementTier),
  }))
}

// Best send time recommendation (0–23 hour)
// Based on read rates per hour (heuristic baseline from industry data)
const HOUR_WEIGHTS: Record<number, number> = {
  8: 0.85, 9: 0.92, 10: 0.95, 11: 0.90, 12: 0.88,
  13: 0.82, 14: 0.79, 15: 0.83, 16: 0.87, 17: 0.90,
  18: 0.93, 19: 0.88, 20: 0.82, 21: 0.72,
}

export function getBestSendHours(): { hour: number; score: number; label: string }[] {
  return Object.entries(HOUR_WEIGHTS)
    .map(([h, score]) => ({
      hour: parseInt(h),
      score: Math.round(score * 100),
      label: `${parseInt(h) % 12 || 12}${parseInt(h) < 12 ? 'am' : 'pm'}`,
    }))
    .sort((a, b) => b.score - a.score)
}

// Campaign quality score (0-100) based on what we know before sending
export function computeCampaignQuality(params: {
  hasTemplate: boolean
  recipientsCount: number
  hasValidVariables: boolean
  templateApproved: boolean
  audienceHasOptOuts: boolean
  listHealthPct: number // 0-1, pct of active contacts
}): { score: number; issues: string[]; recommendations: string[] } {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  if (!params.hasTemplate) { score -= 30; issues.push('No template selected') }
  if (!params.templateApproved) { score -= 20; issues.push('Template not approved by Meta') }
  if (!params.hasValidVariables) { score -= 15; issues.push('Template variables incomplete') }
  if (params.recipientsCount < 10) { score -= 10; recommendations.push('Add more recipients for better results') }
  if (params.audienceHasOptOuts) { score -= 15; issues.push('Audience contains opted-out contacts') }
  if (params.listHealthPct < 0.8) {
    score -= 10
    recommendations.push(`${Math.round((1 - params.listHealthPct) * 100)}% of your list is inactive — consider cleaning`)
  }
  if (params.listHealthPct > 0.9) recommendations.push('Excellent list health')

  return { score: Math.max(0, score), issues, recommendations }
}
