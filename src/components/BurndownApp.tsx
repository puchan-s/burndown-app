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
 * @property {number | null | undefined} dueOnDay - スプリント内の完了予定日（1~sprintDays）、未設定の場合はnullまたはundefined
 * @property {number | null} [parentId] - 親タスクID（nullなら親タスク）
 * @property {Task[]} [children] - 子タスク配列
 */
type Task = {
  id: number;
  name: string;
  estimate: number;
  completedOnDay?: number | null;
  dueOnDay?: number | null;
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
 * @param {string[]} sprintDates - スプリント日付配列
 * @param {Task[]} tasks - タスク配列（子タスクのみ）
 * @returns {ChartPoint[]} チャート描画用データ配列
 */
function buildBurndownData(sprintDates: string[], tasks: Task[]): ChartPoint[] {
  const totalEstimate = tasks.reduce((s, t) => s + t.estimate, 0);
  const idealPerDay = totalEstimate / (sprintDates.length - 1);

  const data: ChartPoint[] = [];
  for (let d = 0; d < sprintDates.length; d++) {
    const dateStr = sprintDates[d];
    // d日目までに完了したタスクの合計見積もり
    const completedSum = tasks
      .filter((t) => t.completedOnDay !== null && t.completedOnDay !== undefined && sprintDates[t.completedOnDay - 1] <= dateStr)
      .reduce((s, t) => s + t.estimate, 0);

    // d日目までに完了予定のタスクの合計見積もり
    const dueSum = tasks
      .filter((t) => t.dueOnDay !== null && t.dueOnDay !== undefined && sprintDates[t.dueOnDay - 1] <= dateStr)
      .reduce((s, t) => s + t.estimate, 0);

    // 実際の残作業量
    const remaining = Math.max(totalEstimate - completedSum, 0);
    // 理想的な残作業量
    const idealRemaining = Math.max(totalEstimate - idealPerDay * d, 0);
    // 完了予定ベースの残作業量
    const dueRemaining = Math.max(totalEstimate - dueSum, 0);

    data.push({
      day: dateStr,
      ideal: Math.round(idealRemaining * 100) / 100,
      actual: Math.round(remaining * 100) / 100,
      due: Math.round(dueRemaining * 100) / 100, // 追加
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

  /** スプリント開始日（例: 今日） */
  const [sprintStartDate] = useState<Date>(new Date());

  /**
   * 指定したスプリント日数分の日付配列を生成
   * @param {Date} startDate - スプリント開始日
   * @param {number} days - スプリント日数
   * @returns {string[]} 日付文字列配列（例: "2025-09-17"）
   */
  const getSprintDates = (startDate: Date, days: number): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10)); // "YYYY-MM-DD"
    }
    return dates;
  };

  const sprintDates = useMemo(() => getSprintDates(sprintStartDate, sprintDays), [sprintStartDate, sprintDays]);

  /** タスク一覧の状態 */
  const [tasks, setTasks] = useState<Task[]>([]);

  /** 新規タスク名の状態 */
  const [newName, setNewName] = useState("");
  /** 新規タスク見積もりの状態 */
  const [newEstimate, setNewEstimate] = useState<number>(1);

  // 新規タスクの親タスクID（親タスクなしなら null）
  const [newParentId, setNewParentId] = useState<number | null>(null);

  /** 新規タスク完了日（初期値: 未完了） */
  const [newCompletedDate, setNewCompletedDate] = useState<string>("");
  /** 新規タスク完了予定日（初期値: 未設定） */
  const [newDueDate, setNewDueDate] = useState<string>("");

  /** チャート用データ（tasksが変化したら再計算） */
  const chartData = useMemo(
    () => buildBurndownData(sprintDates, flattenChildTasks(tasks)),
    [tasks, sprintDates]
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
    // 完了日をインデックス化（未選択ならnull）
    const completedIdx = sprintDates.indexOf(newCompletedDate);
    const dueIdx = sprintDates.indexOf(newDueDate);
    const newTask: Task = {
      id: Date.now(),
      name: newName,
      estimate: newEstimate,
      parentId: newParentId ?? null,
      children: [],
      completedOnDay: completedIdx >= 0 ? completedIdx + 1 : null,
      dueOnDay: dueIdx >= 0 ? dueIdx + 1 : null,
    };

    if (newParentId) {
      // 親タスクの children に追加
      setTasks(prev =>
        prev.map(t =>
          t.id === newParentId ? { ...t, children: [...(t.children ?? []), newTask] } : t
        )
      );
    } else {
      // 親タスクとして追加
      setTasks(prev => [...prev, newTask]);
    }

    setNewName("");
    setNewEstimate(1);
    setNewParentId(null);
    setNewCompletedDate("");
    setNewDueDate("");
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
   * タスクの完了予定日を更新する
   * @param {number} taskId - 対象タスクID
   * @param {number | null} day - 完了予定日（nullで未設定）
   */
  const updateDueDay = (taskId: number, day: number | null) => {
    // 再帰的にタスクと子タスクを更新するヘルパー関数
    const updateTask = (t: Task): Task => {
      if (t.id === taskId) {
        return { ...t, dueOnDay: day };
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

  /**
   * 今日の日付（YYYY-MM-DD形式）を取得
   */
  const todayStr = new Date().toISOString().slice(0, 10);

  /**
   * 今日のタスク（完了予定日が今日のもの）を抽出
   * 親・子タスク両方を対象
   */
  const getTodayTasks = (tasks: Task[]): Task[] => {
    const result: Task[] = [];
    for (const t of tasks) {
      // 親タスク自身が今日のタスク
      if (t.dueOnDay !== undefined && t.dueOnDay !== null && sprintDates[t.dueOnDay - 1] === todayStr) {
        result.push(t);
      }
      // 子タスクもチェック
      if (t.children && t.children.length > 0) {
        result.push(...getTodayTasks(t.children));
      }
    }
    return result;
  };

  const todayTasks = getTodayTasks(tasks);

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sample Burndown App</h1>
        <div className="text-sm text-gray-600">Sprint: {sprintDays} days</div>
      </div>

      <div className="flex">
        {/* 左側：今日のタスク */}
        <div className="flex-1">
          <div className="bg-yellow-50 rounded-lg p-4 shadow mb-6">
            <h3 className="font-medium mb-2">今日のタスク（完了予定日: {todayStr}）</h3>
            {todayTasks.length === 0 ? (
              <div className="text-gray-500">本日のタスクはありません。</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {todayTasks.map(t => (
                  <li key={t.id} className="flex flex-col">
                    {/* 親タスク名（親の場合のみ表示） */}
                    {t.parentId === null || t.parentId === undefined ? (
                      <span className="font-bold text-blue-700">{t.name}</span>
                    ) : null}
                    {/* 子タスクの場合は親タスク名も表示 */}
                    {t.parentId !== null && t.parentId !== undefined ? (
                      <span className="text-xs text-gray-500">
                        親: {tasks.find(p => p.id === t.parentId)?.name}
                      </span>
                    ) : null}
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-gray-500">({t.estimate}h)</span>
                      <label className="text-gray-600 text-xs">完了日:</label>
                      <select
                        value={t.completedOnDay !== undefined && t.completedOnDay !== null ? sprintDates[t.completedOnDay - 1] : ""}
                        onChange={(e) => {
                          const idx = sprintDates.indexOf(e.target.value);
                          updateCompletedDay(t.id, idx >= 0 ? idx + 1 : null);
                        }}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="">未完了</option>
                        {sprintDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* 右側：既存のタスク一覧やチャート */}
        <div className="flex-1">
          {/* ヘッダー: タイトルとスプリント日数表示 */}
          {/* バーンダウンチャート表示 */}
          <BurndownChart data={chartData} />

          {/* タスク追加フォーム */}
          <div className="bg-white rounded-lg p-4 shadow space-y-2">
            <h3 className="font-medium">Add Task</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">タスク名</label>
                <input
                  type="text"
                  placeholder="Task name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="border rounded px-2 py-1 w-40"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">見積もり時間</label>
                <input
                  type="number"
                  placeholder="Estimate"
                  value={newEstimate}
                  min={1}
                  onChange={(e) => setNewEstimate(Number(e.target.value))}
                  className="border rounded px-2 py-1 w-24"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">親タスク</label>
                <select
                  value={newParentId ?? ""}
                  onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
                  className="border rounded px-2 py-1 w-32"
                >
                  <option value="">親タスクなし</option>
                  {tasks.filter(t => !t.parentId).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">完了日</label>
                <select
                  value={newCompletedDate}
                  onChange={e => setNewCompletedDate(e.target.value)}
                  className="border rounded px-2 py-1 w-32"
                >
                  <option value="">未完了</option>
                  {sprintDates.map(date => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">完了予定日</label>
                <select
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="border rounded px-2 py-1 w-32"
                >
                  <option value="">未設定</option>
                  {sprintDates.map(date => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={addTask}
                className="bg-blue-500 text-white px-4 py-2 rounded h-10 self-end"
              >
                Add
              </button>
            </div>
          </div>

          {/* タスク一覧表示（親子構造・完了日編集・削除） */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h3 className="font-medium mb-2">Tasks</h3>
            <ul className="space-y-2 text-sm">
              {/* 親タスクも表示し、子タスクはインデントして表示 */}
              {tasks.map((parent) => (
                <React.Fragment key={parent.id}>
                  <li className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{parent.name}</span>
                      <span className="text-gray-500">({parent.estimate}h)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-gray-600">完了日:</label>
                      <select
                        value={parent.completedOnDay !== undefined && parent.completedOnDay !== null ? sprintDates[parent.completedOnDay - 1] : ""}
                        onChange={(e) => {
                          const idx = sprintDates.indexOf(e.target.value);
                          updateCompletedDay(parent.id, idx >= 0 ? idx + 1 : null);
                        }}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">未完了</option>
                        {sprintDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                      <label className="text-gray-600">完了予定日:</label>
                      <select
                        value={parent.dueOnDay !== undefined && parent.dueOnDay !== null ? sprintDates[parent.dueOnDay - 1] : ""}
                        onChange={(e) => {
                          const idx = sprintDates.indexOf(e.target.value);
                          updateDueDay(parent.id, idx >= 0 ? idx + 1 : null);
                        }}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">未設定</option>
                        {sprintDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteTask(parent.id)}
                        className="text-red-500 hover:underline ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                  {/* 子タスクをインデントして表示 */}
                  {parent.children && parent.children.map((t) => (
                    <li key={t.id} className="flex justify-between items-center pl-6">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-gray-500">({t.estimate}h)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-gray-600">完了日:</label>
                        <select
                          value={t.completedOnDay !== undefined && t.completedOnDay !== null ? sprintDates[t.completedOnDay - 1] : ""}
                          onChange={(e) => {
                            const idx = sprintDates.indexOf(e.target.value);
                            updateCompletedDay(t.id, idx >= 0 ? idx + 1 : null);
                          }}
                          className="border rounded px-2 py-1"
                        >
                          <option value="">未完了</option>
                          {sprintDates.map((date) => (
                            <option key={date} value={date}>
                              {date}
                            </option>
                          ))}
                        </select>
                        <label className="text-gray-600">完了予定日:</label>
                        <select
                          value={t.dueOnDay !== undefined && t.dueOnDay !== null ? sprintDates[t.dueOnDay - 1] : ""}
                          onChange={(e) => {
                            const idx = sprintDates.indexOf(e.target.value);
                            updateDueDay(t.id, idx >= 0 ? idx + 1 : null);
                          }}
                          className="border rounded px-2 py-1"
                        >
                          <option value="">未設定</option>
                          {sprintDates.map((date) => (
                            <option key={date} value={date}>
                              {date}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => deleteTask(t.id)}
                          className="text-red-500 hover:underline ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}