import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { responseLanguageOptions } from "../domain/languages";
import { appLogoPath, appName } from "../shared/app";
import { useAppState } from "../shared/useAppState";
import "./styles.css";

function PopupApp() {
  const { state, isLoading, setSettings } = useAppState();

  function openSidePanel() {
    chrome.runtime.sendMessage({ type: "open-side-panel" });
  }

  if (isLoading || !state) {
    return <main className="popup-shell">Loading...</main>;
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <img src={appLogoPath} alt="" />
          <strong>{appName}</strong>
        </div>
        <div className="toolbar-toggle">
          <span>{state.settings.toolbarEnabled ? "Enabled" : "Disabled"}</span>
          <label className="pill-switch" aria-label="Selection toolbar">
            <input
              type="checkbox"
              checked={state.settings.toolbarEnabled}
              onChange={(event) => setSettings({ toolbarEnabled: event.target.checked })}
            />
            <span className="pill-track" />
          </label>
        </div>
      </header>

      <section className="quick-control">
        <label htmlFor="scenario">Scenario</label>
        <select
          id="scenario"
          value={state.settings.activeScenarioId}
          onChange={(event) => setSettings({ activeScenarioId: event.target.value })}
        >
          {state.scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </select>
      </section>

      <section className="quick-control">
        <label htmlFor="platform">Chat Platform</label>
        <select
          id="platform"
          value={state.settings.activePlatformId}
          onChange={(event) => setSettings({ activePlatformId: event.target.value })}
        >
          {state.platforms.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </select>
      </section>

      <section className="quick-control">
        <label htmlFor="response-language">Response Language</label>
        <select
          id="response-language"
          value={state.settings.responseLanguage}
          onChange={(event) => setSettings({ responseLanguage: event.target.value })}
        >
          {responseLanguageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <button type="button" onClick={openSidePanel}>
        Open side panel
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
