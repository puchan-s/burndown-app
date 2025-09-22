
/**
 * タスクの型定義
 * @typedef {Object} Task
 * @property {number} id - タスクの一意なID
 * @property {string} name - タスク名
 * @property {number} estimate - 見積もり工数（時間）
 * @property {number | null | undefined} completedOnDay - スプリント内の完了日（日付）、未完了の場合はnullまたはundefined
 * @property {number | null | undefined} dueOnDay - スプリント内の完了予定日（日付）、未設定の場合はnullまたはundefined
 * @property {number | null} [parentId] - 親タスクID（nullなら親タスク）
 * @property {Task[]} [children] - 子タスク配列
 */
type Task = {
    id: number;
    name: string;
    estimate: number;
    completedOnDay?: Date | null;
    dueOnDay?: Date | null;
    parentId?: number | null; // nullなら親タスク
    children?: Task[];        // 子タスク配列
};