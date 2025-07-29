import React from "react";

type StatBoxProps = {
    label: string;
    value: string | number;
    icon?: React.ReactNode | null;
};

function StatBox({ label, value, icon = null }: StatBoxProps) {
    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted min-w-[120px] text-center">
            {icon && (
                <div className="flex justify-center mb-2 text-primary">
                    {icon}
                </div>
            )}
            <div className="text-2xl font-bold text-primary">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
        </div>
    );
}

export default StatBox;
