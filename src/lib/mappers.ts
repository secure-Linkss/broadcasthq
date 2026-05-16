import type { templates } from '@/lib/db'

export function mapTemplate(row: typeof templates.$inferSelect) {
  return {
    id:             row.id,
    name:           row.name,
    category:       row.category,
    language:       row.language,
    status:         row.status,
    content:        row.content,
    variables:      row.variables ?? [],
    metaTemplateId: row.metaTemplateId,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  }
}
