import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatHotkeyLabelForPlatform,
  getDefaultHotkey,
  isGlobeLikeHotkey,
} from "../../src/utils/hotkeys";

describe("hotkey utilities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats platform-specific modifier labels", () => {
    expect(formatHotkeyLabelForPlatform("CommandOrControl+Shift+K", "darwin")).toBe("Cmd+Shift+K");
    expect(formatHotkeyLabelForPlatform("CommandOrControl+Shift+K", "win32")).toBe(
      "Ctrl+Shift+K"
    );
  });

  it("treats Fn and Globe as equivalent display hotkeys", () => {
    expect(isGlobeLikeHotkey("Fn")).toBe(true);
    expect(isGlobeLikeHotkey("GLOBE")).toBe(true);
  });

  it("defaults to Globe/Fn on macOS", () => {
    vi.stubGlobal("navigator", { userAgent: "Macintosh" });
    expect(getDefaultHotkey()).toBe("GLOBE");
  });
});
