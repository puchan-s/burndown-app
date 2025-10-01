import React, { useState } from "react";
import { useTasks } from "../context/TasksProvider";

export default function TodayTasks({ initTasks }: { initTasks: Task[] }) {
    const { tasks, setTasks } = useTasks();

    // フラグを追加（trueなら「今日まで」、falseなら「今日のみ」）
    const [showUntilToday, setShowUntilToday] = useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
     */
    const updateCompletedDay = (taskId: number, day: Date | null) => {
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
     * 親階層名を取得
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

    /**
     * 子タスクを抽出
     */
    const getViewTasks = (tasks: Task[]): Task[] => {
        const result: Task[] = [];
        for (const t of tasks) {
        // 親タスク自身が今日のタスク
        if ( t.children && t.children.length === 0 && t.dueOnDay !== undefined && t.dueOnDay !== null ) {
            result.push(t);
        }
        // 子タスクもチェック
        if (t.children && t.children.length > 0) {
            result.push(...getViewTasks(t.children));
        }
        }
        return result;
    };

    const filteredTasks = getViewTasks(initTasks).filter((t) => {
        if (!t.dueOnDay) return false;

        // 破壊的変更を避けるためコピーを作る
        const taskDate = new Date(t.dueOnDay);
        taskDate.setHours(0, 0, 0, 0);

        if (showUntilToday) {
            // 今日まで（過去含む）
            return taskDate.getTime() <= today.getTime();
        } else {
            // 今日のみ
            return taskDate.getTime() === today.getTime();
        }
    });

    return (
        <div className="flex">
            <div className="flex-1">
                {/* ...既存のチャートやタスク一覧... */}
            </div>
            <div className="w-80 ml-6">
                <div className="bg-yellow-50 rounded-lg p-4 shadow mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">今日のタスク</h3>
                        {/* フラグ切り替え */}
                        <label className="flex items-center text-xs space-x-1">
                            <input
                                type="checkbox"
                                checked={showUntilToday}
                                onChange={(e) => setShowUntilToday(e.target.checked)}
                            />
                            <span>今日まで表示</span>
                        </label>
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="text-gray-500">該当タスクはありません。</div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {filteredTasks.map((t) => (
                                <li key={t.id} className="flex flex-col">
                                    {/* 階層の親タスク名 */}
                                    {t.parentId !== null && t.parentId !== undefined && (
                                        <span className="text-xs text-gray-500 mb-1">
                                            {getParentNames(t, tasks)}
                                        </span>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">{t.name}</span>
                                        <span className="text-gray-500">({t.estimate}h)</span>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <input
                                                type="checkbox"
                                                checked={!!t.completedOnDay}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        updateCompletedDay(t.id, new Date());
                                                    } else {
                                                        updateCompletedDay(t.id, null);
                                                    }
                                                }}
                                            />
                                            <span className="text-xs text-gray-600">
                                                {t.completedOnDay
                                                    ? `✔ 完了 (${t.completedOnDay.toISOString().slice(0, 10)})`
                                                    : "未完了"}
                                            </span>
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