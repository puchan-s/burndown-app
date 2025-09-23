
import React from "react";
import { useTasks } from "../context/TasksProvider";


export default function TodayTasks({ todayTasks, sprintDates }: { todayTasks: Task[]; sprintDates: string[] }) {

    const { tasks } = useTasks();
    // TasksProvider から setTasks を取得
    const { setTasks } = useTasks();

    /**
      * 今日の日付（YYYY-MM-DD形式）を取得
      */
    const today = new Date();

    /**
 * タスクIDから再帰的にタスクを検索
 */
    const findTaskById = (tasks: Task[], id: number): Task | undefined => {
        for (const t of tasks) {
            if (t.id === id) return t;
            if (t.children) {
                const found = findTaskById(t.children, id);
                if (found) return found;
            }
        }
        return undefined;
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
     * 指定タスクの親階層名をすべて取得して " > " で連結するユーティリティ
     */
    const getParentNames = (task: Task, allTasks: Task[]): string => {
        const names: string[] = [];
        let currentParentId = task.parentId;
        while (currentParentId !== null && currentParentId !== undefined) {
            const parent = findTaskById(allTasks, currentParentId);
            if (parent) {
                names.unshift(parent.name);
                currentParentId = parent.parentId;
            } else {
                break;
            }
        }
        return names.length > 0 ? `[${names.join("] > [")}]` : "";
    };

    return (
        <div className="flex">
            <div className="flex-1">
                {/* ...既存のチャートやタスク一覧... */}
            </div>
            <div className="w-80 ml-6">
                <div className="bg-yellow-50 rounded-lg p-4 shadow mb-6">
                    <h3 className="font-medium mb-2">今日のタスク（完了予定日: {today.toISOString().slice(0, 10)}）</h3>
                    {todayTasks.length === 0 ? (
                        <div className="text-gray-500">本日のタスクはありません。</div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {todayTasks.map(t => (
                                <li key={t.id} className="flex flex-col">
                                    {/* 階層すべての親タスク名を表示 */}
                                    {t.parentId !== null && t.parentId !== undefined && (
                                        <span className="text-xs text-gray-500 mb-1">
                                            {getParentNames(t, tasks)}
                                        </span>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">{t.name}</span>
                                        <span className="text-gray-500">({t.estimate}h)</span>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <label className="text-gray-600 text-xs">完了日:</label>
                                            <select
                                                value={t.completedOnDay !== undefined && t.completedOnDay !== null ? t.completedOnDay.toISOString().slice(0, 10) : ""}
                                                onChange={(e) => {
                                                    updateCompletedDay(t.id, e.target.value ? new Date(e.target.value) : null);
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
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}