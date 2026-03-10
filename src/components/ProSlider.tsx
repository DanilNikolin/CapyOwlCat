"use client";

import React, { useState, useEffect } from "react";

interface ProSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    defaultValue?: number;
    onChange: (val: number) => void;
    leftLabel?: string;
    rightLabel?: string;
    trackClass?: string;
    valueSuffix?: string;
}

export default function ProSlider({
    label,
    value,
    min,
    max,
    step,
    defaultValue = 0,
    onChange,
    leftLabel,
    rightLabel,
    trackClass = "bg-zinc-800",
    valueSuffix = "",
}: ProSliderProps) {
    const [inputValue, setInputValue] = useState(value.toString());

    // Синхронизируем внутренний инпут при внешнем изменении value (например, когда жмем Reset)
    useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        let num = parseFloat(inputValue);
        if (isNaN(num)) num = defaultValue;
        if (num < min) num = min;
        if (num > max) num = max;
        onChange(num);
        setInputValue(num.toString());
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleInputBlur();
        }
    };

    const handleDoubleClick = () => {
        onChange(defaultValue);
    };


    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-400">
                <span
                    className="cursor-pointer hover:text-white transition-colors"
                    onDoubleClick={handleDoubleClick}
                    title="Double click to reset"
                >
                    {label}
                </span>

                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        className="w-14 text-right bg-black/50 border border-zinc-700 rounded px-1 text-white focus:outline-none focus:border-purple-500 font-mono text-xs"
                    />
                    {valueSuffix && <span className="text-zinc-500">{valueSuffix}</span>}
                </div>
            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full h-2 rounded outline-none accent-purple-500 appearance-none ${trackClass}`}
                onDoubleClick={handleDoubleClick}
                title="Double click range to reset"
            />

            {(leftLabel || rightLabel) && (
                <div className="text-[9px] text-zinc-600 font-mono mt-0 w-full flex justify-between">
                    <span>{leftLabel}</span>
                    <span>{rightLabel}</span>
                </div>
            )}
        </div>
    );
}
