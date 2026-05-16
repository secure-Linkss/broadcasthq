'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UploadResult {
  imported: number
  skipped: number
  duplicates: number
  errors: string[]
}

interface ContactsUploadProps {
  onSuccess: () => void
}

export default function ContactsUpload({ onSuccess }: ContactsUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/contacts/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Upload failed')
      return
    }

    setResult(data)
    if (data.imported > 0) onSuccess()
  }, [onSuccess])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div>
      <label
        htmlFor="csv-upload"
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={loading}
        />
        {loading ? (
          <>
            <div className="upload-icon"><span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} /></div>
            <div className="upload-text">Processing your contacts...</div>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <div className="upload-text">Drop your CSV file here</div>
            <div className="upload-subtext">or click to browse — supports up to 100k contacts</div>
          </>
        )}
      </label>

      {error && <div className="alert alert-error mt-4">{error}</div>}

      {result && (
        <div className="alert alert-success mt-4" style={{ lineHeight: 1.8 }}>
          <strong>Import complete!</strong><br />
          ✅ {result.imported} contacts imported &nbsp;·&nbsp;
          🔄 {result.duplicates} duplicates skipped &nbsp;·&nbsp;
          ⚠️ {result.skipped} invalid rows
          {result.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px' }}>View {result.errors.length} errors</summary>
              <ul style={{ fontSize: '12px', marginTop: 4, paddingLeft: 16 }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="alert alert-info mt-4">
        <strong>CSV format:</strong> Columns: <code>name</code>, <code>phone_number</code> (E.164 or local), <code>opt_in</code> (optional, true/false)
      </div>
    </div>
  )
}
