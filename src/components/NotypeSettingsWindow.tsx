import { useEffect, useMemo, useState } from "react";
import { Copy, History, Mic, Settings2, Trash2 } from "lucide-react";
import languageRegistry from "../config/languageRegistry.json";
import { useToast } from "./ui/Toast";
import { HotkeyInput } from "./ui/HotkeyInput";
import useHotkeyRegistration from "../hooks/useHotkeyRegistration";
import { getValidationMessage } from "../utils/hotkeyValidator";
import { getPlatform } from "../utils/platform";
import { formatHotkeyLabel, getDefaultHotkey } from "../utils/hotkeys";
import { initializeTranscriptions, useTranscriptions } from "../stores/transcriptionStore";
import { useSettingsStore } from "../stores/settingsStore";

type TabId = "settings" | "history";

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="max-w-md">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${checked ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"
          }`}
      />
    </button>
  );
}

export default function NotypeSettingsWindow() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("settings");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [autoStartLoading, setAutoStartLoading] = useState(true);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const history = useTranscriptions();

  const dictationKey = useSettingsStore((state) => state.dictationKey) || getDefaultHotkey();
  const setDictationKey = useSettingsStore((state) => state.setDictationKey);
  const preferredLanguage = useSettingsStore((state) => state.preferredLanguage);
  const setPreferredLanguage = useSettingsStore((state) => state.setPreferredLanguage);
  const audioCuesEnabled = useSettingsStore((state) => state.audioCuesEnabled);
  const setAudioCuesEnabled = useSettingsStore((state) => state.setAudioCuesEnabled);
  const autoPasteEnabled = useSettingsStore((state) => state.autoPasteEnabled);
  const setAutoPasteEnabled = useSettingsStore((state) => state.setAutoPasteEnabled);
  const groqApiKey = useSettingsStore((state) => state.groqApiKey);
  const customReasoningApiKey = useSettingsStore((state) => state.customReasoningApiKey);

  const { registerHotkey, isRegistering } = useHotkeyRegistration({
    onSuccess: (registeredHotkey) => setDictationKey(registeredHotkey),
    showSuccessToast: false,
    showErrorToast: true,
    showAlert: ({ title, description }) => {
      toast({ title, description, variant: "destructive" });
    },
  });

  const languageOptions = useMemo(() => {
    return languageRegistry.languages
      .filter((language) => language.code === "auto" || language.whisper)
      .map((language) => ({
        code: language.code,
        label: language.label,
      }));
  }, []);

  useEffect(() => {
    initializeTranscriptions(50)
      .catch((error) => {
        toast({
          title: "History unavailable",
          description: error instanceof Error ? error.message : "Could not load local history.",
          variant: "destructive",
        });
      })
      .finally(() => setHistoryLoading(false));
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    const loadAutoStart = async () => {
      if (!window.electronAPI?.getAutoStartEnabled) {
        setAutoStartLoading(false);
        return;
      }

      try {
        const enabled = await window.electronAPI.getAutoStartEnabled();
        if (!cancelled) {
          setAutoStartEnabled(Boolean(enabled));
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Launch setting unavailable",
            description:
              error instanceof Error ? error.message : "Could not read the login item status.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setAutoStartLoading(false);
        }
      }
    };

    loadAutoStart();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const setLaunchAtLogin = async (enabled: boolean) => {
    if (!window.electronAPI?.setAutoStartEnabled) {
      return;
    }

    setAutoStartLoading(true);
    try {
      const result = await window.electronAPI.setAutoStartEnabled(enabled);
      if (!result?.success) {
        throw new Error(result?.error || "Could not update the login item.");
      }
      setAutoStartEnabled(enabled);
    } catch (error) {
      toast({
        title: "Launch setting unavailable",
        description: error instanceof Error ? error.message : "Could not update the login item.",
        variant: "destructive",
      });
    } finally {
      setAutoStartLoading(false);
    }
  };

  const copyHistoryEntry = async (text: string) => {
    try {
      await window.electronAPI?.writeClipboard?.(text);
      toast({ title: "Copied", description: "Entry copied to the clipboard.", variant: "success" });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Could not copy the entry.",
        variant: "destructive",
      });
    }
  };

  const deleteHistoryEntry = async (id: number) => {
    try {
      const result = await window.electronAPI?.deleteTranscription?.(id);
      if (!result?.success) {
        throw new Error("Could not delete the entry.");
      }
      toast({ title: "Deleted", description: "Entry removed from local history." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete the entry.",
        variant: "destructive",
      });
    }
  };

  const validateHotkeyForInput = (hotkey: string) => getValidationMessage(hotkey, getPlatform());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(190,242,100,0.35),_transparent_30%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 pb-8 pt-0">
        <div className="app-region-drag -mx-6 h-14 shrink-0 select-none" aria-hidden="true">
          <div className="h-full pl-24 pr-6" />
        </div>

        <div className="flex items-start justify-between gap-6 app-region-drag select-none">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-700">
              NOTYPE
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Speak, clean, paste.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Fast voice dictation for anywhere you type.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Current Hotkey
            </div>
            <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
              <Mic size={18} className="text-lime-700" />
              {formatHotkeyLabel(dictationKey)}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-2 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-sm backdrop-blur app-region-no-drag">
          {[
            { id: "settings", label: "Settings", icon: Settings2 },
            { id: "history", label: "History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${selected
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "settings" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
              <h2 className="text-lg font-semibold">Core Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                One hotkey, one fast path, and a few useful toggles.
              </p>

              <div className="mt-6 space-y-1 divide-y divide-slate-200">
                <SettingRow
                  label="Dictation hotkey"
                  description="Tap once to start recording. Tap again to stop."
                >
                  <div className="w-[220px]">
                    <HotkeyInput
                      value={dictationKey}
                      onChange={(nextHotkey) => void registerHotkey(nextHotkey)}
                      disabled={isRegistering}
                      validate={validateHotkeyForInput}
                    />
                    {dictationKey !== getDefaultHotkey() ? (
                      <button
                        type="button"
                        onClick={() => void registerHotkey(getDefaultHotkey())}
                        className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-900"
                      >
                        Reset to {formatHotkeyLabel(getDefaultHotkey())}
                      </button>
                    ) : null}
                  </div>
                </SettingRow>

                <SettingRow
                  label="Launch at login"
                  description="Start NOTYPE automatically when you sign in."
                >
                  <Toggle
                    checked={autoStartEnabled}
                    onChange={setLaunchAtLogin}
                    disabled={autoStartLoading}
                  />
                </SettingRow>

                <SettingRow
                  label="Recording cue sounds"
                  description="Play short start and stop tones around each dictation session."
                >
                  <Toggle checked={audioCuesEnabled} onChange={setAudioCuesEnabled} />
                </SettingRow>

                <SettingRow
                  label="Auto-paste"
                  description="Paste cleaned output immediately after copying it to the clipboard."
                >
                  <Toggle checked={autoPasteEnabled} onChange={setAutoPasteEnabled} />
                </SettingRow>

                <SettingRow
                  label="Preferred language"
                  description="Leave on auto-detect unless you consistently dictate in one language."
                >
                  <select
                    value={preferredLanguage}
                    onChange={(event) => setPreferredLanguage(event.target.value)}
                    className="min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-lime-600"
                  >
                    {languageOptions.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </SettingRow>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-slate-950 p-6 text-white shadow-sm">
              <h2 className="text-lg font-semibold">Provider Stack</h2>
              <p className="mt-1 text-sm text-slate-300">
                Built around a single fast path.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Transcription
                  </p>
                  <p className="mt-2 text-base font-medium">Groq</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {groqApiKey ? "API key available" : "API key missing"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Cleanup
                  </p>
                  <p className="mt-2 text-base font-medium">Cerebras</p>
                  <p className="mt-3 text-xs text-slate-400">
                    {customReasoningApiKey ? "API key available" : "API key missing"}
                  </p>
                </div>

                <div className="rounded-2xl border border-lime-400/30 bg-lime-400/10 p-4 text-sm text-lime-50">
                  If cleanup fails, the raw transcript stays on the clipboard.
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="mt-6 rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Local History</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your latest captures. Copy or delete anytime.
                </p>
              </div>
              <p className="text-sm text-slate-400">{history.length} entries</p>
            </div>

            {historyLoading ? (
              <div className="py-12 text-sm text-slate-500">Loading history…</div>
            ) : history.length === 0 ? (
              <div className="py-12 text-sm text-slate-500">
                No history yet. Press {formatHotkeyLabel(dictationKey)} to start your first
                dictation.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-6 text-slate-900">{item.text}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                          {formatTimestamp(item.created_at || item.timestamp)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void copyHistoryEntry(item.text)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                        >
                          <Copy size={14} />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteHistoryEntry(item.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                    {item.raw_text && item.raw_text !== item.text ? (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Raw transcript: {item.raw_text}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
