"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Spotlight({
    className,
    fill = "white",
}: {
    className?: string;
    fill?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className={cn(
                "pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500",
                className
            )}
        >
            <svg
                className="absolute h-[169%] w-[138%] lg:w-[84%]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 3787 2842"
                fill="none"
            >
                <g filter="url(#filter)">
                    <ellipse
                        cx="1924.71"
                        cy="273.501"
                        rx="1924.71"
                        ry="273.501"
                        transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
                        fill={fill}
                        fillOpacity="0.21"
                    />
                </g>
                <defs>
                    <filter
                        id="filter"
                        x="0.860352"
                        y="0.838989"
                        width="3785.16"
                        height="2840.26"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                    >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur_1065_8" />
                    </filter>
                </defs>
            </svg>
        </motion.div>
    );
}

// Spotlight Card – glowing hover effect that follows the mouse
export function SpotlightCard({
    children,
    className,
    spotlightColor = "rgba(249, 115, 22, 0.15)",
}: {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}) {
    const divRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current || isFocused) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => setOpacity(1);
    const handleMouseLeave = () => setOpacity(0);

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/80 backdrop-blur-xl",
                className
            )}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-500"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />
            {children}
        </div>
    );
}
