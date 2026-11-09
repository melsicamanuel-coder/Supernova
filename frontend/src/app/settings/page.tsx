"use client";

import { RefreshCw, CheckCircle2, XCircle, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { getSettings, getProviderHealth, type SettingsResponse, type ProviderHealthResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: settings, loading: settingsLoading } = useApi<SettingsResponse>(getSettings);
  const { data: health, loading: healthLoading, refetch: recheckHealth } = useApi<ProviderHealthResponse>(getProviderHealth);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Platform configuration and provider status.</p>
      </div>

      {/* Provider config */}
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
        <h3 className="mb-3 text-sm font-semibold">Provider Configuration</h3>
        {settingsLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-4 w-2/3 animate-pulse rounded bg-surface-3" />)}</div>
        ) : settings ? (
          <div className="space-y-2.5 text-xs">
            <Row label="Active Provider" value={settings.active_provider} />
            <Row label="Default Model" value={settings.default_model} />
            <Row label="Max Retries" value={String(settings.max_retries)} />
            <Row label="Request Timeout" value={`${settings.request_timeout_s}s`} />
            <Row label="Fallback to Mock" value={settings.fallback_to_mock ? "Yes" : "No"} />
            <div className="pt-2">
              <p className="text-[11px] text-muted-foreground">Available providers</p>
              <div className="mt-1.5 flex gap-1.5">
                {settings.available_providers.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-destructive">Failed to load settings</p>
        )}
      </div>

      {/* Health */}
      <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Provider Health</h3>
          <Button size="sm" variant="outline" onClick={recheckHealth} className="h-7 gap-1.5 border-surface-4 text-xs">
            <RefreshCw className="h-3 w-3" /> Recheck
          </Button>
        </div>
        {healthLoading ? (
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-3" />
        ) : health ? (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2">
              {health.status.healthy
                ? <CheckCircle2 className="h-4 w-4 text-nova-success" />
                : <XCircle className="h-4 w-4 text-destructive" />}
              <span className="font-medium">{health.provider}: {health.status.healthy ? "Healthy" : "Unhealthy"}</span>
            </div>
            {health.status.latency_ms != null && <Row label="Latency" value={`${health.status.latency_ms.toFixed(0)}ms`} />}
            {health.status.error && <Row label="Error" value={health.status.error} />}
          </div>
        ) : (
          <p className="text-xs text-destructive">Failed to check health</p>
        )}
      </div>

      <div className="rounded-xl border border-surface-4 bg-surface-1 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">Settings are configured via environment variables (SUPERNOVA_*). Restart the backend to apply changes.</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
