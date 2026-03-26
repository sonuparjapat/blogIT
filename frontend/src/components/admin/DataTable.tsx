"use client"

type Column = {
  label: string
  key: string
  render?: (row: any) => React.ReactNode
}

type Props = {
  columns: Column[]
  data: any[]
}

export default function DataTable({ columns, data }: Props) {

  return (

    <div className="dt-wrapper">

      <div className="dt-scroll">

        <table className="dt-table">

          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="dt-th">
                  <span className="dt-th-inner">
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="dt-empty">
                  <div className="dt-empty-inner">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span>No records found</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="dt-row" style={{ animationDelay: `${i * 30}ms` }}>
                  {columns.map(col => (
                    <td key={col.key} className="dt-td">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --dt-bg:       #111118;
          --dt-header:   #0e0e14;
          --dt-border:   rgba(255,255,255,0.07);
          --dt-row-hover: rgba(99,102,241,0.07);
          --dt-text:     rgba(255,255,255,0.85);
          --dt-muted:    rgba(255,255,255,0.35);
          --dt-accent:   #6366f1;
          --dt-font:     'DM Sans', -apple-system, sans-serif;
          --dt-radius:   14px;
        }

        /* ── Wrapper ── */
        .dt-wrapper {
          background: var(--dt-bg);
          border: 1px solid var(--dt-border);
          border-radius: var(--dt-radius);
          overflow: hidden;
          font-family: var(--dt-font);
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.06),
            0 8px 32px rgba(0,0,0,0.35);
        }

        /* ── Scroll container ── */
        .dt-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .dt-scroll::-webkit-scrollbar { height: 4px; }
        .dt-scroll::-webkit-scrollbar-track { background: transparent; }
        .dt-scroll::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.25);
          border-radius: 4px;
        }

        /* ── Table ── */
        .dt-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 480px;
        }

        /* ── Header ── */
        .dt-th {
          background: var(--dt-header);
          padding: 0;
          text-align: left;
          border-bottom: 1px solid var(--dt-border);
          white-space: nowrap;
        }

        .dt-th:first-child .dt-th-inner { padding-left: 20px; }
        .dt-th:last-child  .dt-th-inner { padding-right: 20px; }

        .dt-th-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 13px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--dt-muted);
        }

        /* accent bar on first th */
        .dt-th:first-child {
          position: relative;
        }
        .dt-th:first-child::before {
          content: '';
          position: absolute;
          left: 0; top: 25%; bottom: 25%;
          width: 2px;
          background: var(--dt-accent);
          border-radius: 0 2px 2px 0;
          opacity: 0.7;
        }

        /* ── Rows ── */
        .dt-row {
          border-bottom: 1px solid var(--dt-border);
          transition: background 0.15s ease;
          animation: row-in 0.3s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .dt-row:last-child { border-bottom: none; }

        .dt-row:hover { background: var(--dt-row-hover); }

        /* ── Cells ── */
        .dt-td {
          padding: 13px 14px;
          font-size: 13.5px;
          font-weight: 400;
          color: var(--dt-text);
          vertical-align: middle;
          line-height: 1.5;
        }

        .dt-td:first-child { padding-left: 20px; }
        .dt-td:last-child  { padding-right: 20px; }

        /* ── Empty state ── */
        .dt-empty {
          padding: 0;
          border: none;
        }

        .dt-empty-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 56px 24px;
          color: var(--dt-muted);
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.02em;
        }

        .dt-empty-inner svg {
          opacity: 0.4;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .dt-th-inner,
          .dt-td { padding: 11px 10px; font-size: 12.5px; }
          .dt-td:first-child,
          .dt-th:first-child .dt-th-inner { padding-left: 14px; }
          .dt-td:last-child,
          .dt-th:last-child  .dt-th-inner { padding-right: 14px; }
        }
      `}</style>

    </div>

  )

}