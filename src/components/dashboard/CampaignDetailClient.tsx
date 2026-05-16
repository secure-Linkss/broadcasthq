'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  template_name: string
  template_variables: Record<string, string>
  status: string
  created_at: string
}

export interface Message {
  id: string
  status: string
  error_message: string | null
  created_at: string
  contacts: { name: string; phone_number: string } | null
}

interface MsgStats {
  total: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
}

interface Props {
  campaign: Campaign
  messages: Message[]
  msgStats: MsgStats
}

export default function CampaignDetailClient({ campaign, messages, msgStats }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null)

  async function handleSend() {
    if (sending) return
    const confirmed = window.confirm(
      `Send this campaign to all opted-in contacts?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    setSending(true)
    setSendResult(null)

    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id }),
    })

    const data = await res.json()
    setSending(false)

    if (!res.ok) {
      setSendResult({ error: data.error || 'Failed to send' })
    } else {
      setSendResult({ success: true, message: data.message })
      setTimeout(() => router.refresh(), 2000)
    }
  }

  const deliveredRate = msgStats.total > 0
    ? Math.round(((msgStats.delivered + msgStats.read) / msgStats.total) * 100)
    : 0

  const templateVars = campaign.template_variables as Record<string, string> ?? {}

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">{campaign.name}</div>
          <div className="page-subtitle">
            <span className={`badge badge-${campaign.status}`}>{campaign.status}</span>
            &nbsp;&nbsp;Created {new Date(campaign.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/campaigns" className="btn btn-secondary">← Campaigns</Link>
          {campaign.status === 'draft' && (
            <button
              id="send-campaign-btn"
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? <><span className="spinner" /> Queuing...</> : '🚀 Send Campaign'}
            </button>
          )}
        </div>
      </div>

      <div className="page-body fade-in">
        {/* Send feedback */}
        {sendResult?.error && (
          <div className="alert alert-error mb-6">{sendResult.error}</div>
        )}
        {sendResult?.success && (
          <div className="alert alert-success mb-6">
            ✅ {sendResult.message} — messages are being sent in the background.
          </div>
        )}

        {/* Campaign info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="card">
            <div className="text-sm text-muted mb-2">Message Template</div>
            <div style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '14px',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}>
              {campaign.template_name}
            </div>

            {Object.keys(templateVars).length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-muted mb-2">Template Variables</div>
                {Object.entries(templateVars).map(([k, v]) => (
                  <div key={k} className="flex gap-2 mb-1">
                    <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{`{{${k}}}`}</code>
                    <span className="text-sm text-muted">→</span>
                    <span className="text-sm">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="card">
            <div className="text-sm text-muted mb-4">Message Stats</div>
            {msgStats.total === 0 ? (
              <div className="text-muted text-sm">No messages sent yet. Click &ldquo;Send Campaign&rdquo; to start.</div>
            ) : (
              <>
                <div className="stat-card-value mb-1">{msgStats.total.toLocaleString()}</div>
                <div className="text-sm text-muted mb-4">Total recipients</div>

                <div className="progress-bar-wrap mb-3">
                  <div className="progress-bar-fill" style={{ width: `${deliveredRate}%` }} />
                </div>
                <div className="text-sm text-muted mb-4">{deliveredRate}% delivered or read</div>

                {[
                  { label: 'Pending',   count: msgStats.pending,   color: 'var(--status-pending)' },
                  { label: 'Sent',      count: msgStats.sent,      color: 'var(--status-sent)' },
                  { label: 'Delivered', count: msgStats.delivered, color: 'var(--status-delivered)' },
                  { label: 'Read',      count: msgStats.read,      color: 'var(--status-read)' },
                  { label: 'Failed',    count: msgStats.failed,    color: 'var(--status-failed)' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      <span className="text-sm">{s.label}</span>
                    </div>
                    <span className="text-sm font-semibold">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Messages table */}
        {messages.length > 0 && (
          <div className="card">
            <div className="font-semibold mb-4">Message Log <span className="text-muted font-normal text-sm">(showing first 200)</span></div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.contacts?.name || '—'}</td>
                      <td className="mono text-muted">{m.contacts?.phone_number || '—'}</td>
                      <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                      <td className="text-muted text-xs">{m.error_message || '—'}</td>
                      <td className="text-muted">{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
