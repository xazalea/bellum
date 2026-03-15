"use client";

import React, { useState } from "react";
import {
    motion,
    AnimatePresence,
    useScroll,
    useMotionValueEvent,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NavItem = {
    name: string;
    link: string;
    icon?: React.ReactNode;
};

export function FloatingNav({
    navItems,
    className,
}: {
    navItems: NavItem[];
    className?: string;
}) {
    const { scrollYProgress } = useScroll();
    const [visible, setVisible] = useState(true);

    useMotionValueEvent(scrollYProgress, "change", (current) => {
        if (typeof current === "number") {
            const direction = current - (scrollYProgress.getPrevious() ?? 0);
            if (scrollYProgress.get() < 0.05) {
                setVisible(true);
            } else {
                if (direction < 0) {
                    setVisible(true);
                } else {
                    setVisible(false);
                }
            }
        }
    });

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 1, y: -100 }}
                animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "fixed inset-x-0 top-6 z-[5000] mx-auto flex max-w-fit items-center justify-center gap-1 rounded-full border border-white/[0.08] bg-black/80 px-4 py-2 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] backdrop-blur-xl",
                    className
                )}
            >
                {navItems.map((navItem, idx) => (
                    <Link
                        key={`nav-${idx}`}
                        href={navItem.link}
                        className={cn(
                            "relative flex items-center gap-1.5 px-4 py-2 text-sm text-neutral-400 transition-colors hover:text-white"
                        )}
                    >
                        {navItem.icon && (
                            <span className="text-sm">{navItem.icon}</span>
                        )}
                        <span className="hidden sm:block">{navItem.name}</span>
                    </Link>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}
