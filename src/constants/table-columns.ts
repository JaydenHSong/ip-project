// Table column definitions for Reports pages
// Used by useColumnVisibility hook and ColumnVisibilityToggle component

export type ColumnDef = {
  id: string
  labelKey: string
  locked: boolean
  defaultVisible: boolean
  defaultWidth: number
  minWidth: number
  sortField?: string
}

// Reports Queue (ReportsContent.tsx)
export const REPORT_QUEUE_COLUMNS: ColumnDef[] = [
  { id: 'checkbox',   labelKey: '',                        locked: true,  defaultVisible: true,  defaultWidth: 40,  minWidth: 40 },
  { id: 'no',         labelKey: 'No.',                     locked: true,  defaultVisible: true,  defaultWidth: 56,  minWidth: 50 },
  { id: 'status',     labelKey: 'common.status',           locked: true,  defaultVisible: true,  defaultWidth: 110, minWidth: 80,  sortField: 'status' },
  { id: 'br_case_id', labelKey: 'reports.table.brCaseId',  locked: false, defaultVisible: true,  defaultWidth: 110, minWidth: 80 },
  { id: 'channel',    labelKey: 'reports.table.channel',   locked: false, defaultVisible: true,  defaultWidth: 65,  minWidth: 40,  sortField: 'channel' },
  { id: 'asin',       labelKey: 'reports.asin',            locked: false, defaultVisible: true,  defaultWidth: 140, minWidth: 100, sortField: 'asin' },
  { id: 'violation',  labelKey: 'reports.violation',       locked: false, defaultVisible: true,  defaultWidth: 150, minWidth: 100, sortField: 'violation' },
  { id: 'seller',     labelKey: 'reports.seller',          locked: false, defaultVisible: true,  defaultWidth: 220, minWidth: 100, sortField: 'seller' },
  { id: 'requester',  labelKey: 'reports.createdBy',       locked: false, defaultVisible: true,  defaultWidth: 110, minWidth: 80,  sortField: 'requester' },
  { id: 'date',       labelKey: 'common.date',             locked: false, defaultVisible: true,  defaultWidth: 95,  minWidth: 80,  sortField: 'date' },
  { id: 'updated',    labelKey: 'reports.table.updated',   locked: false, defaultVisible: false, defaultWidth: 95,  minWidth: 80,  sortField: 'updated' },
  { id: 'resolved',   labelKey: 'reports.table.resolved',  locked: false, defaultVisible: false, defaultWidth: 115, minWidth: 80,  sortField: 'resolved' },
]

// Completed Reports — same structure as queue
export const COMPLETED_COLUMNS: ColumnDef[] = REPORT_QUEUE_COLUMNS

// Archived Reports — simpler structure
export const ARCHIVED_COLUMNS: ColumnDef[] = [
  { id: 'violation',   labelKey: 'reports.violation',          locked: true,  defaultVisible: true, defaultWidth: 150, minWidth: 100 },
  { id: 'asin',        labelKey: 'reports.asin',               locked: true,  defaultVisible: true, defaultWidth: 150, minWidth: 100 },
  { id: 'title',       labelKey: 'reports.table.title',        locked: false, defaultVisible: true, defaultWidth: 250, minWidth: 150 },
  { id: 'reason',      labelKey: 'reports.table.reason',       locked: false, defaultVisible: true, defaultWidth: 200, minWidth: 100 },
  { id: 'archived_at', labelKey: 'reports.table.archivedAt',   locked: false, defaultVisible: true, defaultWidth: 120, minWidth: 80 },
  { id: 'action',      labelKey: 'common.action',              locked: true,  defaultVisible: true, defaultWidth: 80,  minWidth: 60 },
]

// Utility: get visible columns
export const getVisibleColumns = (columns: ColumnDef[], hiddenIds: string[]): ColumnDef[] =>
  columns.filter((col) => !hiddenIds.includes(col.id))

// Utility: get widths arrays for visible columns
export const getVisibleColumnWidths = (columns: ColumnDef[], hiddenIds: string[]) => {
  const visible = getVisibleColumns(columns, hiddenIds)
  return {
    defaultWidths: visible.map((col) => col.defaultWidth),
    minWidths: visible.map((col) => col.minWidth),
  }
}

// Utility: get default hidden IDs
export const getDefaultHiddenIds = (columns: ColumnDef[]): string[] =>
  columns.filter((col) => !col.defaultVisible).map((col) => col.id)

// Utility: simple hash for storageKey differentiation
export const columnsHash = (ids: string[]): string => {
  let h = 0
  const s = ids.join(',')
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}
