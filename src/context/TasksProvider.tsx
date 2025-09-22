"use client";
import React, { createContext, useContext, useState, useMemo } from "react";

type TasksContextType = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children, initialTasks = [] }: { children: React.ReactNode; initialTasks?: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // value を memoize して不要な再レンダリングを防ぐ
  const value = useMemo(() => ({ tasks, setTasks }), [tasks]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

// 安全に useContext を使うためのカスタムフック
export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}

