"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { NavigationIsland, MinimalNavIsland } from "@/components/ui/dynamic-island";

interface DynamicIslandNavProps {
  variant?: "default" | "minimal";
  className?: string;
}

export function DynamicIslandNav({
  variant = "default",
  className,
}: DynamicIslandNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  if (variant === "minimal") {
    return (
      <MinimalNavIsland
        currentPath={pathname}
        onNavigate={handleNavigate}
        className={className}
      />
    );
  }

  return (
    <NavigationIsland
      currentPath={pathname}
      onNavigate={handleNavigate}
      className={className}
    />
  );
}

// HOC to wrap pages with navigation
export function withDynamicIslandNav<P extends object>(
  Component: React.ComponentType<P>,
  variant: "default" | "minimal" = "default"
) {
  return function WithDynamicIslandNavWrapper(props: P) {
    return (
      <>
        <DynamicIslandNav variant={variant} />
        <Component {...props} />
      </>
    );
  };
}