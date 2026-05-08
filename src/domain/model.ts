export type ScenarioId = string;
export type ActionId = string;
export type PlatformId = string;

export type ActionType = "local" | "prompt" | "inputPrompt" | "panel";
export type ActionButtonStyle = "iconOnly" | "iconText";
export type PlatformType = "aiChat" | "messaging";
export type ResponseLanguage = "auto" | string;

export interface Scenario {
  id: ScenarioId;
  name: string;
  color: string;
  actionIds: ActionId[];
  description?: string;
  isStarter?: boolean;
}

export interface Action {
  id: ActionId;
  name: string;
  type: ActionType;
  icon: string;
  iconSvg?: string;
  color: string;
  instruction?: string;
  config?: {
    translationTargetLanguage?: string;
  };
  isBuiltIn?: boolean;
}

export interface ChatPlatform {
  id: PlatformId;
  name: string;
  type: PlatformType;
  url: string;
  hostPattern: string;
}

export interface UserSettings {
  activeScenarioId: ScenarioId;
  activePlatformId: PlatformId;
  includePageUrl: boolean;
  responseLanguage: ResponseLanguage;
  actionButtonStyle: ActionButtonStyle;
  toolbarEnabled: boolean;
  blockedSites: string[];
}

export interface AppMeta {
  schemaVersion: 1;
  hasCompletedOnboarding: boolean;
}

export interface AppState {
  meta: AppMeta;
  scenarios: Scenario[];
  actions: Action[];
  platforms: ChatPlatform[];
  settings: UserSettings;
}
