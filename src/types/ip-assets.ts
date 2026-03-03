export const IP_TYPES = ['patent', 'design_patent', 'trademark', 'copyright'] as const
export type IpType = (typeof IP_TYPES)[number]

export const IP_ASSET_STATUSES = [
  'preparing', 'filed', 'oa', 'registered',
  'transferred', 'disputed', 'expired', 'abandoned',
] as const
export type IpAssetStatus = (typeof IP_ASSET_STATUSES)[number]

export type IpAsset = {
  id: string
  ip_type: IpType
  management_number: string
  name: string
  description: string | null
  country: string
  status: IpAssetStatus
  application_number: string | null
  application_date: string | null
  registration_number: string | null
  registration_date: string | null
  expiry_date: string | null
  keywords: string[]
  image_urls: string[]
  related_products: string[]
  report_url: string | null
  assignee: string | null
  notes: string | null
  monday_item_id: string | null
  monday_board_id: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}
