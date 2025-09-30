"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/button";

function addMonths(d: Date, m: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() + m);
  return nd;
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function MonthCalendar() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = (first.getDay() + 7) % 7; // 0=Sun
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const days = last.getDate();
    const cells: { key: string; label: string; dim?: boolean }[] = [];
    // prev month fill
    const prevLast = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ key: `p-${i}`, label: String(prevLast - i), dim: true });
    }
    // current month
    for (let d = 1; d <= days; d++) cells.push({ key: `c-${d}`, label: String(d) });
    // next month fill to complete 6 rows
    while (cells.length % 7 !== 0) cells.push({ key: `n-${cells.length}`, label: String((cells.length % 7) + 1), dim: true });
    while (cells.length < 42) cells.push({ key: `n2-${cells.length}`, label: "", dim: true });
    return cells;
  }, [cursor]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-default-200 p-3 bg-content1">
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" variant="light" onPress={() => setCursor((c) => addMonths(c, -1))}>
          Sebelumnya
        </Button>
        <div className="font-medium">{monthLabel}</div>
        <Button size="sm" variant="light" onPress={() => setCursor((c) => addMonths(c, 1))}>
          Selanjutnya
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-tiny text-default-500 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {grid.map((c) => (
          <div
            key={c.key}
            className={`h-9 rounded-md text-center text-sm flex items-center justify-center ${c.dim ? "text-default-400" : "bg-default-100"}`}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonthCalendar;

