"use client";
import React, { useMemo, useState, useEffect } from "react";
import BurndownChart, { ChartPoint } from "./BurndownChart";
import TaskList from "./taskList";
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

          {/* タスク一覧表示 */}
          <TaskList sprintDates={sprintDates} />

        </div>
      </div>
    </div>
  );
}