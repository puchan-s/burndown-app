import React, { useState, useMemo } from "react";
import { useTasks, } from "../context/TasksProvider";

export default function TaskList() {

    // TasksProvider から setTasks を取得
    const { setTasks } = useTasks();

    const { tasks } = useTasks();

    const getDueDateOptions = (): string[] => {
        const options: string[] = [];
        const end = new Date();
        end.setMonth(end.getMonth() + 6); // 6ヶ月後
        const start = new Date();
        start.setMonth(start.getMonth() - 6); // 6ヶ月前
        for (
            let d = new Date(start);
            d <= end;
            d.setDate(d.getDate() + 1)
        ) {
            options.push(d.toISOString().slice(0, 10));
        }
        return options;
    };

    const selectDateOptions = useMemo(getDueDateOptions, []);

    /** 新規タスク名の状態 */
    const [newName, setNewName] = useState("");
    /** 新規タスク見積もりの状態 */
    const [newEstimate, setNewEstimate] = useState<number>(1);

    // 新規タスクの親タスクID（親タスクなしなら null）
    const [newParentId, setNewParentId] = useState<number | null>(null);

    /** 新規タスク完了予定日（初期値: 未設定） */
    const [newDueDate, setNewDueDate] = useState<Date | null>(null);

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
            collapsed: false,   // 初期状態は展開状態
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
                            {!isLeaf && (
                                <button
                                    onClick={() => toggleCollapse(t.id)}
                                    className="text-xs text-gray-500 mr-1"
                                >
                                    {t.collapsed ? "▶" : "▼"}
                                </button>
                            )}
                            <span
                                className={level === 0 ? "font-bold text-blue-700 cursor-pointer" : "font-medium cursor-pointer"}
                                onClick={() => !isLeaf && toggleCollapse(t.id)}
                            >
                                {t.name}
                            </span>
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
                                    value={t.completedOnDay !== undefined && t.completedOnDay !== null ? t.completedOnDay.toISOString().slice(0, 10) : ""}
                                    onChange={(e) => { e.target.value !== "" ? updateCompletedDay(t.id, new Date(e.target.value)) : updateCompletedDay(t.id, null); }}
                                    className="border rounded px-2 py-1"
                                >
                                    <option value="">未完了</option>
                                    {selectDateOptions.map((date) => (
                                        <option key={date} value={date}>
                                            {date}
                                        </option>
                                    ))}
                                </select>
                                <label className="text-gray-600">完了予定日:</label>
                                <select
                                    value={t.dueOnDay !== undefined && t.dueOnDay !== null ? t.dueOnDay.toISOString().slice(0, 10) : ""}
                                    onChange={(e) => {
                                        e.target.value !== "" ? updateDueDay(t.id, new Date(e.target.value)) : updateDueDay(t.id, null);
                                    }}
                                    className="border rounded px-2 py-1"
                                >
                                    <option value="">未設定</option>
                                    {selectDateOptions.map((date) => (
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
                    {t.children && t.children.length > 0 && !t.collapsed && renderTasks(t.children, level + 1)}
                </React.Fragment>
            );
        });

    // 👇 子階層を折りたたむ/展開する関数
    const toggleCollapse = (taskId: number) => {
        const updateTask = (t: Task): Task => {
            if (t.id === taskId) {
                return { ...t, collapsed: !t.collapsed };
            }
            if (t.children && t.children.length > 0) {
                return { ...t, children: t.children.map(updateTask) };
            }
            return t;
        };
        setTasks(prev => prev.map(updateTask));
    };

    return (
        <div>
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
                            onChange={e => e.target.value !== "" ? setNewDueDate(new Date(e.target.value)) : setNewDueDate(null)}
                            className="border rounded px-2 py-1 w-32"
                        >
                            <option value="">未設定</option>
                            {selectDateOptions.map(date => (
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
    );
};