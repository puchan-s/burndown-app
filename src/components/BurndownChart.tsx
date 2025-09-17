"use client";
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type ChartPoint = {
  day: string;         // 表示ラベル (例: "2025-09-17")
  ideal: number;       // 理想の残工数（理論線）
  actual: number;      // 実際の残工数
  due?: number;        // 完了予定ベースの残工数
};

export default function BurndownChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="w-full h-80 bg-white rounded-lg p-4 shadow">
      <h2 className="text-lg font-medium mb-2">バーンダウンチャート</h2>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          {/* 理想線 */}
          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
            name="理想"
          />
          {/* 実績線 */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#82ca9d"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="実績"
          />
          {/* 完了予定線 */}
          <Line
            type="monotone"
            dataKey="due"
            stroke="#ff9800"
            strokeWidth={2}
            dot={false}
            name="完了予定"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
