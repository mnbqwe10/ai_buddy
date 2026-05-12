interface InputPromptFormOptions {
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function createInputPromptForm({ onSubmit, onCancel }: InputPromptFormOptions) {
  const form = document.createElement("form");
  form.className = "ai-buddy-input-panel";
  form.hidden = true;
  form.autocomplete = "off";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "ai-buddy-input";
  input.placeholder = "Ask about this selection...";
  input.ariaLabel = "Ask about this selection";
  form.appendChild(input);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value) {
      onSubmit(value);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  });

  return form;
}

export function setInputPromptFormVisible(form: HTMLFormElement, isVisible: boolean, options: { clear?: boolean } = {}) {
  form.hidden = !isVisible;
  form.dataset.visible = String(isVisible);

  if (options.clear) {
    getInputPromptInput(form).value = "";
  }
}

export function focusInputPromptForm(form: HTMLFormElement) {
  getInputPromptInput(form).focus();
}

function getInputPromptInput(form: HTMLFormElement) {
  const input = form.querySelector<HTMLInputElement>(".ai-buddy-input");
  if (!input) {
    throw new Error("Input prompt form is missing its input control.");
  }
  return input;
}
