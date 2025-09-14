"use client";
import React, { useMemo, useState } from "react";
import BurndownChart, { ChartPoint } from "./BurndownChart";

/**
 * タスクの型定義
 * @property {number} id - タスクの一意なID
 * @property {string} name - タスク名
 * @property {number} estimate - 見積もり工数（時間）
 * @property {number | null | undefined} completedOnDay - スプリント内の完了日（1~sprintDays）、未完了の場合はnullまたはundefined
 */
type Task = {
  id: number;
  name: string;
  estimate: number;
  completedOnDay?: number | null; // スプリント内の完了日（1~sprintDays）
};

/**
 * バーンダウンチャート用データを生成する関数
 * @param {number} sprintDays - スプリント日数
 * @param {Task[]} tasks - タスク配列
 * @returns {ChartPoint[]} チャート描画用データ配列
 */
function buildBurndownData(sprintDays: number, tasks: Task[]): ChartPoint[] {
  const totalEstimate = tasks.reduce((s, t) => s + t.estimate, 0); // 総見積もり
  const idealPerDay = totalEstimate / (sprintDays - 1); // 理想的な1日あたりの消化量

  const data: ChartPoint[] = [];
  for (let d = 1; d <= sprintDays; d++) {
    // d日目までに完了したタスクの合計見積もり
    const completedSum = tasks
      .filter((t) => t.completedOnDay && t.completedOnDay <= d)
      .reduce((s, t) => s + t.estimate, 0);

    // 実際の残作業量
    const remaining = Math.max(totalEstimate - completedSum, 0);
    const idx = d - 1;
    // 理想的な残作業量
    const idealRemaining = Math.max(totalEstimate - idealPerDay * idx, 0);

    data.push({
      day: `Day ${d}`,
      ideal: Math.round(idealRemaining * 100) / 100,
      actual: Math.round(remaining * 100) / 100,
    });
  }
  return data;
}

/**
 * バーンダウンアプリのメインコンポーネント
 * - チャート表示
 * - タスク追加
 * - タスク完了日編集
 */
export default function BurndownApp() {
  /** スプリント日数 */
  const sprintDays = 14;

  /** タスク一覧の状態 */
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, name: "要件整理", estimate: 5, completedOnDay: 1 },
    { id: 2, name: "画面設計", estimate: 8, completedOnDay: 2 },
  ]);

  /** 新規タスク名の状態 */
  const [newName, setNewName] = useState("");
  /** 新規タスク見積もりの状態 */
  const [newEstimate, setNewEstimate] = useState<number>(1);

  /** チャート用データ（tasksが変化したら再計算） */
  const chartData = useMemo(() => buildBurndownData(sprintDays, tasks), [tasks]);

  /**
   * タスク追加処理
   */
  const addTask = () => {
    if (!newName) return;
    const newTask: Task = {
      id: tasks.length + 1,
      name: newName,
      estimate: newEstimate,
      completedOnDay: null,
    };
    setTasks([...tasks, newTask]);
    setNewName("");
    setNewEstimate(1);
  };

  /**
   * タスクの完了日を更新する
   * @param {number} taskId - 対象タスクID
   * @param {number | null} day - 完了日（nullで未完了）
   */
  const updateCompletedDay = (taskId: number, day: number | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completedOnDay: day } : t))
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sample Burndown App</h1>
        <div className="text-sm text-gray-600">Sprint: {sprintDays} days</div>
      </div>

      {/* バーンダウンチャート表示 */}
      <BurndownChart data={chartData} />

      {/* タスク追加フォーム */}
      <div className="bg-white rounded-lg p-4 shadow space-y-2">
        <h3 className="font-medium">Add Task</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Task name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <input
            type="number"
            placeholder="Estimate"  
            value={newEstimate}
            min={1}
            onChange={(e) => setNewEstimate(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
          <button
            onClick={addTask}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* タスク一覧（完了日を選択できる） */}
      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-medium mb-2">Tasks</h3>
        <ul className="space-y-2 text-sm">
          {tasks.map((t) => (
            <li key={t.id} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{t.name}</span>
                <span className="text-gray-500">({t.estimate}h)</span>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-gray-600">完了日:</label>
                <select
                  value={t.completedOnDay ?? ""}
                  onChange={(e) =>
                    updateCompletedDay(
                      t.id,
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="border rounded px-2 py-1"
                >
                  <option value="">未完了</option>
                  {Array.from({ length: sprintDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}