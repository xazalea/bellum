"use client";

import { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { UsernameModal } from "@/components/ui/username-modal";

function AuthModalHandler() {
  const { showUsernameModal, setShowUsernameModal, signUp, isLoading } = useAuth();

  const handleSubmit = async (username: string) => {
    return signUp(username);
  };

  if (isLoading) return null;

  return (
    <UsernameModal
      isOpen={showUsernameModal}
      onSubmit={handleSubmit}
      onClose={() => setShowUsernameModal(false)}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModalHandler />
    </AuthProvider>
  );
}