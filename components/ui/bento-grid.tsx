"use client";

import { cn } from "@/lib/utils";

export function BentoGrid({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
                className
            )}
        >
            {children}
        </div>
    );
}

export function BentoGridItem({
    className,
    title,
    description,
    header,
    icon,
    onClick,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
}) {
    return (
        <div
            className={cn(
                "group/bento row-span-1 flex flex-col justify-between space-y-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/80 p-4 shadow-input transition duration-200 hover:border-white/[0.15] hover:shadow-xl backdrop-blur-xl cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {header && <div className="w-full overflow-hidden rounded-xl">{header}</div>}
            <div className="transition duration-200 group-hover/bento:translate-x-2">
                {icon}
                <div className="mb-2 mt-2 font-sans font-bold text-neutral-200">
                    {title}
                </div>
                <div className="font-sans text-xs font-normal text-neutral-400">
                    {description}
                </div>
            </div>
        </div>
    );
}
