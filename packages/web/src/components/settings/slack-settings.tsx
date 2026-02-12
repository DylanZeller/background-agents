"use client";

import { useState, useEffect } from "react";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "@open-inspect/shared";

function getAllModelOptions() {
  return MODEL_OPTIONS.flatMap((category) => category.models);
}

async function fetchDefaultModel(): Promise<string> {
  const response = await fetch("/api/config/slack-default-model");
  if (!response.ok) {
    throw new Error("Failed to fetch");
  }
  const data = (await response.json()) as { model: string };
  return data.model;
}

async function updateDefaultModel(model: string): Promise<void> {
  const response = await fetch("/api/config/slack-default-model", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!response.ok) {
    throw new Error("Failed to update");
  }
}

export function SlackSettings() {
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchDefaultModel()
      .then(setCurrentModel)
      .catch(() => {
        // Use default if not configured yet
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateDefaultModel(currentModel);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const modelOptions = getAllModelOptions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Slack Bot Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the default model used by the Slack bot for new sessions.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="model-select" className="text-sm font-medium text-foreground">
              Default Model
            </label>
            <select
              id="model-select"
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="w-full max-w-md px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} - {option.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              This model will be used as the default for new Slack bot sessions.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded">
              Default model updated successfully!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </div>
  );
}
