import React from "react";

type StatBoxProps = {
    label: string;
    value: string | number;
};

function StatBox({ label, value }: StatBoxProps) {
    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted min-w-[120px] text-center">
            <div className="text-2xl font-bold text-primary">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}

export default StatBox;