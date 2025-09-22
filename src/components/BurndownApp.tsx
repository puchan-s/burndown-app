"use client";
import React, { useMemo, useState, useEffect } from "react";
import BurndownChart, { ChartPoint } from "./BurndownChart";
import { useTasks } from "../context/TasksProvider";
import TodayTasks from "./todayTasks";

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
    } else {
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
    const dateStr = new Date(sprintDates[d]);
    // d日目までに完了したタスクの合計見積もり
    const completedSum = tasks
      .filter((t) => t.completedOnDay !== null && t.completedOnDay !== undefined && t.completedOnDay <= dateStr)
      .reduce((s, t) => s + t.estimate, 0);

    // d日目までに完了予定のタスクの合計見積もり
    const dueSum = tasks
      .filter((t) => t.dueOnDay !== null && t.dueOnDay !== undefined && t.dueOnDay <= dateStr)
      .reduce((s, t) => s + t.estimate, 0);

    // 実際の残作業量
    const remaining = Math.max(totalEstimate - completedSum, 0);
    // 理想的な残作業量
    const idealRemaining = Math.max(totalEstimate - idealPerDay * d, 0);
    // 完了予定ベースの残作業量
    const dueRemaining = Math.max(totalEstimate - dueSum, 0);

    data.push({
      day: sprintDates[d],
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
  const [sprintDays, setSprintDays] = useState<number>(14);

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

  /**
   * 指定した開始日から指定日数分の日付配列を生成
   * @param {string} startDateStr - 開始日（YYYY-MM-DD）
   * @param {number} days - 日数
   * @returns {string[]} 日付文字列配列
   */
  const getSprintDatesFromStart = (startDateStr: string, days: number): string[] => {
    const dates: string[] = [];
    const startDate = new Date(startDateStr);
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  };

  const sprintDates = useMemo(() => getSprintDates(sprintStartDate, sprintDays), [sprintStartDate, sprintDays]);

  /** タスク一覧の状態 */
  const { tasks, setTasks } = useTasks();

  /** 新規タスク名の状態 */
  const [newName, setNewName] = useState("");
  /** 新規タスク見積もりの状態 */
  const [newEstimate, setNewEstimate] = useState<number>(1);

  // 新規タスクの親タスクID（親タスクなしなら null）
  const [newParentId, setNewParentId] = useState<number | null>(null);

  /** 新規タスク完了予定日（初期値: 未設定） */
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);

  // --- グラフ用の開始日状態 ---
  const [chartGraphStartDate, setChartGraphStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  /**
   * グラフ用の日付配列（指定した開始日から）
   */
  const chartGraphDates = useMemo(
    () => getSprintDatesFromStart(chartGraphStartDate, sprintDays),
    [chartGraphStartDate, sprintDays]
  );

  /** グラフ用データ（グラフ開始日・日数変更時も再計算される） */
  const chartData = useMemo(
    () => buildBurndownData(chartGraphDates, flattenChildTasks(tasks)),
    [tasks, chartGraphDates]
  );

  /**
   * タスクを初期化する
   * @param task - 初期化するタスク
   * @returns - 初期化されたタスク
   */
  const initTask = (task: Task) => {

    const retTask = { ...task };

      if( task.dueOnDay ) {
        retTask.dueOnDay = new Date(task.dueOnDay);
      }
      if( task.completedOnDay ) {
        retTask.completedOnDay = new Date(task.completedOnDay);
      }
      if( retTask.children && retTask.children.length > 0 ) {

        const childList: Task[] = [];

        for( let child of retTask.children ) {
          childList.push(initTask(child));
        }

        retTask.children = childList;
      }

      return retTask;
  };

  /**
   * コンポーネントの初回マウント時にローカルストレージからタスク一覧を取得し、状態にセットする副作用
   * - ページをリロードしても前回保存したタスク一覧を復元できる
   */
  useEffect(() => {
    const localData = localStorage.getItem("tasks");
    if (localData) {

      const parsedTasks = [];

      for( let task of JSON.parse(localData) ) {
        parsedTasks.push(initTask(task));
      }
      
      setTasks(parsedTasks);
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
   * タスク追加処理（親タスクを無制限階層化対応）
   */
  const addTask = () => {
    if (!newName) return;
    if (!newDueDate) return;

    const newTask: Task = {
      id: Date.now(),
      name: newName,
      estimate: newEstimate,
      parentId: newParentId ?? null,
      children: [],
      completedOnDay: null,
      dueOnDay: newDueDate ? newDueDate : null,
    };

    // 再帰的に親タスクを探してchildrenに追加
    const addChild = (tasks: Task[]): Task[] => {
      return tasks.map(t => {
        if (t.id === newParentId) {
          return { ...t, children: [...(t.children ?? []), newTask] };
        }
        if (t.children && t.children.length > 0) {
          return { ...t, children: addChild(t.children) };
        }
        return t;
      });
    };

    if (newParentId) {
      setTasks(prev => addChild(prev));
    } else {
      setTasks(prev => [...prev, newTask]);
    }

    setNewName("");
    setNewEstimate(1);
    setNewParentId(null);
    setNewDueDate(null);
  };


  /**
   * タスクの完了日を更新する
   * @param {number} taskId - 対象タスクID
   * @param {Date | null} day - 完了日（nullで未完了）
   */
  const updateCompletedDay = (taskId: number, day: Date | null) => {
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
  const updateDueDay = (taskId: number, day: Date | null) => {
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
   * タスクのストーリーポイントを更新する
   * @param {number} taskId - 対象タスクID
   * @param {number} estimate - 新しいストーリーポイント
   */
  const updateEstimate = (taskId: number, estimate: number) => {
    // 再帰的にタスクと子タスクを更新する
    const updateTask = (t: Task): Task => {
      if (t.id === taskId) {
        return { ...t, estimate };
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
   * 2つの日付が同じかどうかを判定するユーティリティ
   * @param d1  - 対象日付1
   * @param d2  - 対象日付2
   * @returns  - 同じ日付であればtrue、そうでなければfalse
   */
function isSameDate(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

  /**
   * 今日のタスク（完了予定日が今日のもの）を抽出
   * 親・子タスク両方を対象
   */
  const getTodayTasks = (tasks: Task[]): Task[] => {
    const result: Task[] = [];
    for (const t of tasks) {
      // 親タスク自身が今日のタスク
      if ( t.children && t.children.length === 0 && t.dueOnDay !== undefined && t.dueOnDay !== null && isSameDate(t.dueOnDay, new Date())) {
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

  /**
   * 階層ごとにインデントをつけてタスクを表示し、最下層のみ詳細項目を表示
   */
  const renderTasks = (tasks: Task[], level: number = 0): JSX.Element[] =>
    tasks.map((t) => {
      const isLeaf = !t.children || t.children.length === 0;
      return (
        <React.Fragment key={t.id}>
          <li
            className="flex justify-between items-center"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            <div className="flex items-center space-x-2">
              <span className={level === 0 ? "font-bold text-blue-700" : "font-medium"}>{t.name}</span>
            </div>
            {/* 最下層のみ完了日・完了予定日・削除ボタンを表示 */}
            {isLeaf && (
              <div className="flex items-center space-x-2">

                <label className="text-gray-600">ストーリーポイント:</label>
                <input
                  type="number"
                  min={1}
                  value={t.estimate}
                  onChange={e => updateEstimate(t.id, Number(e.target.value))}
                  className="border rounded px-2 py-1 w-16 text-gray-500"
                  style={{ marginLeft: "8px" }}
                />

                <label className="text-gray-600">完了日:</label>
                <select
                  value={ t.completedOnDay !== undefined && t.completedOnDay !== null ? t.completedOnDay.toISOString().slice(0, 10) : "" }
                  onChange={(e) => {updateCompletedDay(t.id, new Date(e.target.value));}}
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
                  value={ t.dueOnDay !== undefined && t.dueOnDay !== null ? t.dueOnDay.toISOString().slice(0, 10) : "" }
                  onChange={(e) => {
                    updateDueDay(t.id, new Date(e.target.value));
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
                  削除
                </button>
              </div>
            )}
          </li>
          {t.children && t.children.length > 0 && renderTasks(t.children, level + 1)}
        </React.Fragment>
      );
    });

  // --- グラフ開始日選択肢を1年前から表示 ---
  const getDateOptions = (): string[] => {
    const options: string[] = [];
    const today = new Date();
    const start = new Date(today);
    start.setFullYear(today.getFullYear() - 1); // 1年前
    for (
      let d = new Date(start);
      d <= today;
      d.setDate(d.getDate() + 1)
    ) {
      options.push(d.toISOString().slice(0, 10));
    }
    return options;
  };

  const graphDateOptions = useMemo(getDateOptions, []);

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sample Burndown App</h1>
          {/* グラフ開始日・日数選択フォーム */}
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm text-gray-700 mr-2">グラフの開始日:</label>
            <select
              value={chartGraphStartDate}
              onChange={e => setChartGraphStartDate(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {graphDateOptions.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
            <label className="text-sm text-gray-700 ml-4 mr-2">グラフ日数:</label>
            <input
              type="number"
              min={1}
              max={sprintDates.length}
              value={sprintDays}
              onChange={e => setSprintDays(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20"
            />
          </div>
      </div>

      <div className="flex">
        {/* 左側：今日のタスク */}
        {/* --- 今日のタスクリスト表示（右側に固定、親階層すべて表示） --- */}
        <TodayTasks todayTasks={todayTasks}  sprintDates={sprintDates} />

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
                <label className="text-xs text-gray-600 mb-1">ストーリーポイント</label>
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
                  {/* 階層を再帰的に表示 */}
                  {(() => {
                    // 階層を表すprefixを付けてoptionを再帰的に生成
                    const renderOptions = (tasks: Task[], prefix: string = ""): JSX.Element[] =>
                      tasks.flatMap(t => [
                        <option key={t.id} value={t.id}>{prefix + t.name}</option>,
                        ...(t.children ? renderOptions(t.children, prefix + "　") : [])
                      ]);
                    return renderOptions(tasks);
                  })()}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-600 mb-1">完了予定日</label>
                <select
                  value={newDueDate ? newDueDate.toISOString().slice(0, 10) : ""}
                  onChange={e => setNewDueDate(new Date(e.target.value))}
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
              {renderTasks(tasks)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}