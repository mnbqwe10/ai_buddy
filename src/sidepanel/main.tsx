import { StrictMode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultAppState } from "../domain/defaults";
import { resolveSendMode } from "../domain/sendPolicy";
import { sidePanelPortName } from "../background/promptRouter";
import type { PendingPrompt, RuntimeMessage } from "../shared/messages";
import { appLogoPath } from "../shared/app";
import { useAppState } from "../shared/useAppState";
import { bridgeSourceForPlatform } from "./platformBridge";
import { messageOriginForPlatformUrl, minimumFrameWidthForPlatform } from "./platformFrame";
import "./styles.css";

function isDeliverPromptMessage(message: unknown): message is Extract<RuntimeMessage, { type: "deliver-prompt" }> {
  return Boolean(
    message &&
      typeof message === "object" &&
      "type" in message &&
      message.type === "deliver-prompt" &&
      "prompt" in message,
  );
}

function SidePanelApp() {
  const { state, isLoading, setSettings } = useAppState();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const requestCounterRef = useRef(0);
  const [status, setStatus] = useState("Side panel shell ready.");
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [isBridgeReady, setIsBridgeReady] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(null);
  const [autoSendLockEnabled, setAutoSendLockEnabled] = useState(false);
  const effectiveState = state ?? createDefaultAppState();

  const activeScenario =
    effectiveState.scenarios.find((scenario) => scenario.id === effectiveState.settings.activeScenarioId) ??
    effectiveState.scenarios[0];
  const activePlatform =
    effectiveState.platforms.find((platform) => platform.id === effectiveState.settings.activePlatformId) ??
    effectiveState.platforms[0];
  const canUseBridge = activePlatform.type === "aiChat" || activePlatform.type === "messaging";
  const bridgeSource = bridgeSourceForPlatform(activePlatform.id, activePlatform.type);
  const minimumFrameWidth = minimumFrameWidthForPlatform(activePlatform.id);
  const platformMessageOrigin = messageOriginForPlatformUrl(activePlatform.url);
  const sendMode = resolveSendMode({
    platform: activePlatform,
    autoSendLockEnabled,
  });

  const pingBridge = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !canUseBridge) {
      return;
    }

    iframeRef.current.contentWindow.postMessage(
      {
        source: bridgeSource,
        type: "bridge-ping",
      },
      platformMessageOrigin,
    );
  }, [bridgeSource, canUseBridge, platformMessageOrigin]);

  useEffect(() => {
    if (typeof chrome === "undefined") {
      return;
    }

    let isActive = true;
    let reconnectTimer: number | null = null;
    let port: chrome.runtime.Port | null = null;

    function handlePortMessage(message: unknown) {
      if (isDeliverPromptMessage(message)) {
        setPendingPrompt(message.prompt);
        setStatus("Prompt queued.");
      }
    }

    function connectSidePanelPort() {
      if (!isActive) {
        return;
      }

      port = chrome.runtime.connect({ name: sidePanelPortName });
      port.onMessage.addListener(handlePortMessage);
      port.onDisconnect.addListener(() => {
        port = null;
        if (isActive) {
          reconnectTimer = window.setTimeout(connectSidePanelPort, 500);
        }
      });
    }

    connectSidePanelPort();

    chrome.runtime.sendMessage({ type: "claim-pending-prompt" }, (response) => {
      if (response?.prompt) {
        setPendingPrompt(response.prompt);
        setStatus("Prompt queued while ChatGPT loads.");
      }
    });

    return () => {
      isActive = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      port?.disconnect();
    };
  }, []);

  useEffect(() => {
    setIsIframeReady(false);
    setIsBridgeReady(false);
    setAutoSendLockEnabled(false);
    setStatus(`Loading ${activePlatform.name}...`);
  }, [activePlatform.id, activePlatform.name]);

  useEffect(() => {
    if (!isIframeReady || isBridgeReady || !canUseBridge) {
      return;
    }

    pingBridge();
    const interval = window.setInterval(pingBridge, 300);
    return () => window.clearInterval(interval);
  }, [canUseBridge, isBridgeReady, isIframeReady, pingBridge]);

  useEffect(() => {
    function handleBridgeMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const message = event.data;
      if (!message || message.source !== bridgeSource) {
        return;
      }

      if (message.type === "bridge-ready") {
        setIsBridgeReady(true);
        setStatus(`${activePlatform.name} bridge ready.`);
        return;
      }

      if (message.type === "inject-result") {
        if (message.result?.ok) {
          setStatus(message.result.mode === "drafted" ? "Prompt drafted." : "Prompt sent.");
        } else {
          setStatus(message.result?.error ?? "Prompt delivery failed.");
        }
      }
    }

    window.addEventListener("message", handleBridgeMessage);
    return () => window.removeEventListener("message", handleBridgeMessage);
  }, [activePlatform.name]);

  useEffect(() => {
    if (!pendingPrompt || !isBridgeReady || !iframeRef.current?.contentWindow || !canUseBridge) {
      return;
    }

    const requestId = `prompt-${Date.now()}-${requestCounterRef.current++}`;
    setStatus(sendMode === "draftOnly" ? "Drafting prompt..." : "Sending prompt...");

    iframeRef.current.contentWindow.postMessage(
      {
        source: bridgeSource,
        type: "inject-prompt",
        requestId,
        promptText: pendingPrompt.promptText,
        submit: sendMode === "autoSubmit",
      },
      platformMessageOrigin,
    );
    setPendingPrompt(null);
  }, [bridgeSource, canUseBridge, isBridgeReady, pendingPrompt, platformMessageOrigin, sendMode]);

  return (
    <main className="sidepanel-shell">
      <section className="compact-control-panel">
        <img className="sidepanel-logo" src={appLogoPath} alt="AI Buddy" />
        <label className="compact-field">
          <span>Platform</span>
          <select
            value={effectiveState.settings.activePlatformId}
            onChange={(event) => setSettings({ activePlatformId: event.target.value })}
          >
            {effectiveState.platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </label>
        <label className="compact-field">
          <span>Scenario</span>
          <select
            value={effectiveState.settings.activeScenarioId}
            onChange={(event) => setSettings({ activeScenarioId: event.target.value })}
          >
            {effectiveState.scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
        </label>
        {activePlatform.type === "messaging" && (
          <label className="lock-row">
            <input
              type="checkbox"
              checked={autoSendLockEnabled}
              onChange={(event) => setAutoSendLockEnabled(event.target.checked)}
            />
            Auto-Send Lock
          </label>
        )}
      </section>

      <section className="chat-frame-panel" data-platform-id={activePlatform.id}>
        {canUseBridge ? (
          <iframe
            ref={iframeRef}
            title={activePlatform.name}
            src={activePlatform.url}
            allow="clipboard-read; clipboard-write"
            style={minimumFrameWidth ? { minWidth: minimumFrameWidth, width: minimumFrameWidth } : undefined}
            onLoad={() => {
              setIsIframeReady(true);
              setStatus(`${activePlatform.name} loaded, waiting for bridge...`);
              pingBridge();
            }}
          />
        ) : (
          <div className="chat-frame-placeholder">
            <p>{activePlatform.name} adapter will be connected in a later slice.</p>
          </div>
        )}
      </section>

      <p className="status-line" title={isLoading ? "Loading settings..." : status}>
        {isLoading ? "Loading settings..." : status}
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SidePanelApp />
  </StrictMode>,
);
