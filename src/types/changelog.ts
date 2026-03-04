export type ChangelogCategory = 'new' | 'fix' | 'policy' | 'ai'

export type ChangelogEntry = {
  id: string
  category: ChangelogCategory
  title: string
  description: string | null
  created_by: string | null
  created_at: string
}
