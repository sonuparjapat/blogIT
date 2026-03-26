"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function AnalyticsChart({ data }: any) {

  const formatted = data?.map((d:any)=>({
    date: new Date(d.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    }),
    views: Number(d.views)
  }))

  return (
    <div className="chart-box">

      <h2 className="chart-title">Daily Views</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formatted}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <style>{`
        .chart-box {
          background:#111118;
          border:1px solid rgba(255,255,255,0.07);
          border-radius:14px;
          padding:18px;
        }

        .chart-title {
          font-size:14px;
          margin-bottom:10px;
          color:rgba(255,255,255,0.8);
        }
      `}</style>

    </div>
  )
}