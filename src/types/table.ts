export type SortDirection = 'asc' | 'desc'

export type SortState<T extends string = string> = {
  field: T
  direction: SortDirection
}

export type TableFilters = {
  search: string
  violationType: string
  marketplace: string
}
