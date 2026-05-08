export interface LanguageOption {
  value: string;
  label: string;
}

export const responseLanguageOptions: LanguageOption[] = [
  { value: "auto", label: "Auto" },
  { value: "English", label: "English" },
  { value: "Chinese", label: "中文" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
];

export const translationLanguageOptions = responseLanguageOptions.filter(
  (option) => option.value !== "auto",
);
