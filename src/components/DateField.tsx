import { Calendar } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type DateFieldProps = {
  label: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
};

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm text-gray-700">
        {value ? format(value, "yyyy-MM-dd") : "未設定"}
      </span>

      {/* カレンダーポップオーバー */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-1 rounded hover:bg-gray-100">
            <Calendar className="h-4 w-4 text-gray-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-white shadow rounded">
          <CalendarComponent
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => onChange(date ?? null)}
          />
        </PopoverContent>
      </Popover>

      {/* クリアボタン（未定義に戻す） */}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          title="未設定に戻す"
        >
          <X className="h-4 w-4 text-gray-500" />
        </Button>
      )}
    </div>
  );
}
