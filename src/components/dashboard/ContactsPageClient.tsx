'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ContactsUpload from './ContactsUpload'

interface Contact {
  id: string
  name: string
  phone_number: string
  opt_in: boolean
  created_at: string
}

interface Props {
  initialContacts: Contact[]
  totalCount: number
}

export default function ContactsPageClient({ initialContacts, totalCount }: Props) {
  const [contacts, setContacts] = useState(initialContacts)
  const [showUpload, setShowUpload] = useState(false)
  const router = useRouter()

  function handleUploadSuccess() {
    router.refresh()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Contacts</div>
          <div className="page-subtitle">{totalCount.toLocaleString()} total contacts</div>
        </div>
        <button
          id="upload-contacts-btn"
          className="btn btn-primary"
          onClick={() => setShowUpload(v => !v)}
        >
          {showUpload ? '✕ Close' : '+ Import CSV'}
        </button>
      </div>

      <div className="page-body fade-in">
        {showUpload && (
          <div className="card mb-6">
            <div className="font-semibold mb-4">Import Contacts</div>
            <ContactsUpload onSuccess={handleUploadSuccess} />
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No contacts yet</div>
              <div className="empty-state-desc">Upload a CSV file to import your contacts. We support up to 100k contacts per import.</div>
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                Import CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Contact List</div>
              <div className="text-sm text-muted">Showing first 100</div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Opt-in</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name || '—'}</td>
                      <td className="mono">{c.phone_number}</td>
                      <td>
                        {c.opt_in
                          ? <span className="badge badge-delivered">Opted In</span>
                          : <span className="badge badge-failed">Opted Out</span>
                        }
                      </td>
                      <td className="text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalCount > 100 && (
              <div className="alert alert-info mt-4">
                Showing 100 of {totalCount.toLocaleString()} contacts.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
