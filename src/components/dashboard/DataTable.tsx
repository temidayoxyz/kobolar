export type Column<T> = {
  key: string
  header: string
  render: (row: T) => React.ReactNode
}

export function DataTable<T>({ rows, columns, empty }: { rows: T[]; columns: Column<T>[]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
