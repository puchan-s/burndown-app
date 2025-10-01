import React, { useState } from "react";
import { useTasks } from "../context/TasksProvider";

export default function TodayTasks({ initTasks }: { initTasks: Task[] }) {
    const { tasks, setTasks } = useTasks();

    // 表示モード: today / untilToday / fromToday
    const [filterMode, setFilterMode] = useState<"today" | "untilToday" | "fromToday">("today");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    const getViewTasks = (tasks: Task[]): Task[] => {
        const result: Task[] = [];
        for (const t of tasks) {
            if (t.children && t.children.length === 0 && t.dueOnDay !== undefined && t.dueOnDay !== null) {
                result.push(t);
            }
            if (t.children && t.children.length > 0) {
                result.push(...getViewTasks(t.children));
            }
        }
        return result;
    };

    const filteredTasks = getViewTasks(initTasks).filter((t) => {

        let viewFlg = false;

        if (!t.dueOnDay) return viewFlg;

        // 破壊的変更を避けるためコピーを作る
        const taskDate = new Date(t.dueOnDay);
        taskDate.setHours(0, 0, 0, 0);

        if (filterMode === "untilToday"
            && taskDate.getTime() < today.getTime() && t.completedOnDay === null
        ) {
            // 今日以前で未完了のタスク(今日まで表示)
            viewFlg = true;

        } else if (taskDate.getTime() === today.getTime()) {
            // 今日のタスク
            viewFlg = true;
        }else if (filterMode === "fromToday"
            && taskDate.getTime() > today.getTime() && t.completedOnDay === null
        ){
            // 今日以降で未完了のタスク(今日以降表示)
            viewFlg = true;
        }

        return viewFlg;


    });

    return (
        <div className="flex">
            <div className="flex-1">{/* ...既存のチャートやタスク一覧... */}</div>
            <div className="w-80 ml-6">
                <div className="bg-yellow-50 rounded-lg p-4 shadow mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">タスク表示</h3>
                        <select
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value as any)}
                            className="text-xs border rounded px-1 py-0.5"
                        >
                            <option value="today">今日のみ</option>
                            <option value="untilToday">今日まで</option>
                            <option value="fromToday">今日以降</option>
                        </select>
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="text-gray-500">該当タスクはありません。</div>
                    ) : (
                        <ul className="space-y-2 text-sm">
                            {filteredTasks.map((t) => (
                                <li key={t.id} className="flex flex-col">
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