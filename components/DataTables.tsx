'use client'

import React from 'react'

export type Column<T> = {
  key: Extract<keyof T, string>; 
  label: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  showTotals?: boolean
  /** função que recebe as linhas tipadas e retorna um map com os valores dos totais */
  getTotals?: (rows: T[]) => Record<string, React.ReactNode>
  emptyMessage?: string
}

export default function DataTable<T>({
  columns,
  rows,
  showTotals,
  getTotals,
  emptyMessage = 'Nenhum registro encontrado.'
}: DataTableProps<T>) {
  return (
    <div className="overflow-auto">
      <table className="w-full table-auto border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`p-2 text-${col.align || 'left'} ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={`p-2 text-${col.align || 'left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key])}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="p-4 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>

        {showTotals && getTotals && rows.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t">
              {columns.map(col => (
                <td
                  key={String(col.key)}
                  className={`p-2 text-${col.align || 'left'} ${col.className || ''}`}
                >
                  {getTotals(rows)[String(col.key)] ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
