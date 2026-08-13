"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#4f46e5", "#6366f1", "#8b5cf6", "#a855f7", "#22c55e", "#ef4444", "#f59e0b", "#94a3b8"];

export default function AnalyticsClient({ funnel, statusData, scoreDist }: {
  funnel: { stage: string; count: number }[];
  statusData: { name: string; value: number }[];
  scoreDist: { bucket: string; count: number }[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Application Funnel</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={funnel}><XAxis dataKey="stage" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>{statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
        </ResponsiveContainer>
      </div>
      <div className="card p-4 md:col-span-2">
        <h3 className="font-semibold mb-3">Match-Score Distribution (feed)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={scoreDist}><XAxis dataKey="bucket" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
