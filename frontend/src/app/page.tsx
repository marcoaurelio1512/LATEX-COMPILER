"use client";

import { useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { Workspace } from "@/components/Workspace";

export default function HomePage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [initialFile, setInitialFile] = useState<string | null>(null);

  if (projectId) {
    return (
      <Workspace
        projectId={projectId}
        initialFile={initialFile}
        onClose={() => {
          setProjectId(null);
          setInitialFile(null);
        }}
      />
    );
  }

  return (
    <HomeScreen
      onOpenProject={(p) => {
        setInitialFile(p.initial_file ?? p.config?.main_file ?? null);
        setProjectId(p.id);
      }}
    />
  );
}
