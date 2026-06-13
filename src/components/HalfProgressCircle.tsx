'use client';

import React from 'react';

interface CircularProgressStepsProps {
    currentStep?: number;
    totalSteps?: number;
    size?: number;
    strokeWidth?: number;
    circleColor?: string;
    progressColor?: string;
    textColor?: string;
    stepColor?: string;
    stepTextColor?: string;
}

const CircleProgress: React.FC<CircularProgressStepsProps> = ({
    currentStep = 1,
    totalSteps = 2,
    size = 60,
    strokeWidth = 6,
    circleColor = '#DDDDDD',
    progressColor = '#00B8A9',
    textColor = '#00000',
    stepColor: _stepColor = '#00000',
    stepTextColor: _stepTextColor = '#00000',
}) => {
    // Calculate progress percentage
    const progress = (currentStep / totalSteps) * 100;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Calculate positions for step markers
    const _getStepPosition = (stepIndex: number) => {
        const angle = (360 / totalSteps) * stepIndex - 90; // Start from top
        const rad = (angle * Math.PI) / 180;
        const x = radius + radius * Math.cos(rad);
        const y = radius + radius * Math.sin(rad);
        return { x, y };
    };

    return (
        <div className="flex items-center justify-center relative">
            <svg
                width={size}
                height={size}
                className="transition-all duration-300 ease-in-out"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={circleColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={progressColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="transition-all duration-500 ease-in-out"
                />


                {/* Center text */}
                <text
                    x={size / 2}
                    y={size / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    className="font-sans select-none font-bold"
                    fontSize={size * 0.2}
                    fontWeight="bold"
                >
                    {currentStep}/{totalSteps}
                </text>
            </svg>
        </div>
    );
};

export default CircleProgress;