"use client";
import React, { useMemo, useState, useEffect } from "react";
import BurndownChart, { ChartPoint } from "./BurndownChart";

/**
 * タスクの型定義
 * @typedef {Object} Task
 * @property {number} id - タスクの一意なID
 * @property {string} name - タスク名
 * @property {number} estimate - 見積もり工数（時間）
 * @property {number | null | undefined} completedOnDay - スプリント内の完了日（1~sprintDays）、未完了の場合はnullまたはundefined
 * @property {number | null} [parentId] - 親タスクID（nullなら親タスク）
 * @property {Task[]} [children] - 子タスク配列
 */
type Task = {
  id: number;
  name: string;
  estimate: number;
  completedOnDay?: number | null;
  parentId?: number | null; // nullなら親タスク
  children?: Task[];        // 子タスク配列
};

/**
 * タスク配列（親子構造）から子タスクのみをフラットな配列に変換するユーティリティ
 * @param {Task[]} tasks - 親子構造のタスク配列
 * @returns {Task[]} 子タスクのみのフラットな配列
 */
const flattenChildTasks = (tasks: Task[]): Task[] => {
  let result: Task[] = [];
  for (const t of tasks) {
    if (t.children && t.children.length > 0) {
      result = result.concat(flattenChildTasks(t.children));
    } else if (t.parentId !== null) {
      result.push(t);
    }
  }
  return result;
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
  const [tasks, setTasks] = useState<Task[]>([]);

  /** 新規タスク名の状態 */
  const [newName, setNewName] = useState("");
  /** 新規タスク見積もりの状態 */
  const [newEstimate, setNewEstimate] = useState<number>(1);

  // 新規タスクの親タスクID（親タスクなしなら null）
  const [newParentId, setNewParentId] = useState<number | null>(null);

  /** チャート用データ（tasksが変化したら再計算） */
  const chartData = useMemo(
    () => buildBurndownData(sprintDays, flattenChildTasks(tasks)),
    [tasks]
  );

  /**
   * コンポーネントの初回マウント時にローカルストレージからタスク一覧を取得し、状態にセットする副作用
   * - ページをリロードしても前回保存したタスク一覧を復元できる
   */
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) {
      setTasks(JSON.parse(saved));
    }
  }, []);

  /**
   * タスク一覧（tasks）が変更されるたびにローカルストレージへ保存する副作用
   * - ユーザーがタスクを追加・編集・削除した際に、最新の状態を永続化する
   */
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  /**
   * タスク追加処理
   */
  const addTask = () => {
    if (!newName) return;
    const newTask: Task = {
      id: Date.now(),
      name: newName,
      estimate: newEstimate,
      parentId: newParentId ?? null,
      children: []
    };

    if (newParentId) {
      // 親タスクの children に追加
      setTasks(prev =>
        prev.map(t =>
          t.id === newParentId ? { ...t, children: [...(t.children || []), newTask] } : t
        )
      );
    } else {
      // 親タスクとして追加
      setTasks(prev => [...prev, newTask]);
    }

    setNewName("");
    setNewEstimate(1);
    setNewParentId(null);
  };


  /**
   * タスクの完了日を更新する
   * @param {number} taskId - 対象タスクID
   * @param {number | null} day - 完了日（nullで未完了）
   */
  const updateCompletedDay = (taskId: number, day: number | null) => {
    // 再帰的にタスクと子タスクを更新するヘルパー関数
    const updateTask = (t: Task): Task => {
      if (t.id === taskId) {
        return { ...t, completedOnDay: day };
      }
      if (t.children && t.children.length > 0) {
        return { ...t, children: t.children.map(updateTask) };
      }
      return t;
    };
    setTasks((prev) => prev.map(updateTask));
  };

  /**
   * タスク削除処理
   * @param {number} taskId - 削除するタスクのID
   */
  const deleteTask = (taskId: number) => {
    // 再帰的にタスク配列から指定IDのタスクを削除
    const removeTask = (tasks: Task[]): Task[] => {
      return tasks
        .filter(t => t.id !== taskId)
        .map(t =>
          t.children && t.children.length > 0
            ? { ...t, children: removeTask(t.children) }
            : t
        );
    };
    setTasks(prev => removeTask(prev));
  };

  /**
   * タスク一覧をローカルストレージに保存するユーティリティ関数
   * @param {Task[]} tasks - 保存するタスク配列
   */
  const saveTasks = (tasks: Task[]) => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  };

  /**
   * ローカルストレージからタスク一覧を取得するユーティリティ関数
   * @returns {Task[]} 保存されているタスク配列。なければ空配列を返す
   */
  const loadTasks = () => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ヘッダー: タイトルとスプリント日数表示 */}
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
          {/* タスク名入力欄 */}
          <input
            type="text"
            placeholder="Task name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          {/* 見積もり時間入力欄 */}
          <input
            type="number"
            placeholder="Estimate"
            value={newEstimate}
            min={1}
            onChange={(e) => setNewEstimate(Number(e.target.value))}
            className="border rounded px-2 py-1 w-24"
          />
          {/* 親タスク選択欄 */}
          <select
            value={newParentId ?? ""}
            onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded px-2 py-1"
          >
            <option value="">親タスクなし</option>
            {tasks.filter(t => t.parentId === null).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {/* タスク追加ボタン */}
          <button
            onClick={addTask}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* タスク一覧表示（親子構造・完了日編集・削除） */}
      <div className="bg-white rounded-lg p-4 shadow"></div>
      <h3 className="font-medium mb-2">Tasks</h3>
      <ul className="space-y-2 text-sm">
        {/* 親タスクのみ表示 */}
        {tasks.filter(t => t.parentId === null).map(parent => (
          <li key={parent.id}>
            <div className="flex justify-between items-center">
              <span className="font-medium">{parent.name}</span>
              {/* 親タスク用の完了日や削除ボタン（未実装） */}
            </div>
            {/* 子タスクがあれば表示 */}
            {parent.children && parent.children.length > 0 && (
              <ul className="ml-4 space-y-1">
                {parent.children.map(child => (
                  <li key={child.id} className="flex justify-between items-center">
                    {/* 子タスク名と見積もり */}
                    <span>{child.name} ({child.estimate}h)</span>
                    <div className="flex items-center space-x-2">
                      {/* 完了日選択 */}
                      <label className="text-gray-600">完了日:</label>
                      <select
                        value={child.completedOnDay ?? ""}
                        onChange={(e) =>
                          updateCompletedDay(
                            child.id,
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

                      {/* 子タスク削除ボタン */}
                      <button
                        onClick={() => deleteTask(child.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}