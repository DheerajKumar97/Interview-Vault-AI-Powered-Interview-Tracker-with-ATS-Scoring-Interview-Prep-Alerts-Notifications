import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

export const LoadingOverlay = ({ isLoading, message = "Processing..." }: LoadingOverlayProps) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setProgress(0);
            return;
        }

        // Reset progress when loading starts
        setProgress(0);

        const interval = setInterval(() => {
            setProgress((prev) => {
                // Fast at first, then slower as it approaches 90%
                const remaining = 95 - prev;
                const increment = Math.max(1, Math.floor(remaining / 10));

                if (prev >= 95) return prev; // Stall at 95% until done
                return prev + increment;
            });
        }, 400);

        return () => clearInterval(interval);
    }, [isLoading]);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-all duration-300">
            <div className="flex flex-col items-center justify-center p-8 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="relative mb-6 h-20 w-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin relative z-10 stroke-[2.5]" />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <span className="text-sm font-bold text-blue-700">{progress}%</span>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{message}</h3>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden border border-gray-200">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <p className="text-sm text-gray-500 text-center animate-pulse">
                    This may take a few moments...
                </p>
            </div>
        </div>
    );
};
