import { useEffect, useState } from "react";

interface CircularScoreProps {
    score: number;
    size?: number;
    strokeWidth?: number;
}

export const CircularScore = ({ score, size = 120, strokeWidth = 8 }: CircularScoreProps) => {
    const [progress, setProgress] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    // Determine color based on score
    const getColor = (score: number) => {
        if (score < 60) return "#ef4444"; // red-500
        if (score < 70) return "#f97316"; // orange-500
        return "#22c55e"; // green-500
    };

    const color = getColor(score);

    // Animate progress on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setProgress(score);
        }, 100);
        return () => clearTimeout(timer);
    }, [score]);

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle with animation */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color }}>
                    {score.toFixed(0)}%
                </span>
                <span className="text-xs text-gray-500 mt-1">
                    {score < 60 ? "Poor" : score < 70 ? "Fair" : "Good"}
                </span>
            </div>
        </div>
    );
};
