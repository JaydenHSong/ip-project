'use client'

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-3 py-2.5"><div className="h-3.5 w-40 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="h-3.5 w-14 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="ml-auto h-3.5 w-14 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="ml-auto h-3.5 w-16 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="ml-auto h-3.5 w-12 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="ml-auto h-3.5 w-10 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="ml-auto h-3.5 w-10 rounded bg-th-bg-tertiary" /></td>
    <td className="px-3 py-2.5"><div className="h-3.5 w-16 rounded bg-th-bg-tertiary" /></td>
  </tr>
)

export { SkeletonRow }
