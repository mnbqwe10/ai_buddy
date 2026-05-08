const nativeControlSelector = "select, option, input, textarea";

export function shouldPreventToolbarMouseDown(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return !target.closest(nativeControlSelector);
}

export function targetIsNativeToolbarControl(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(nativeControlSelector));
}
