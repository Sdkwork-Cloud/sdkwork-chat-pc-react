import { useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@sdkwork/openchat-pc-i18n";
import { ToolsResultService, ToolsService } from "../services";
import type { PasswordOptions, Tool, ToolCategory, ToolExecutionOptions, ToolHistory } from "../types";
import {
  buildToolsWorkspaceLibrary,
  buildToolsWorkspaceSummary,
  filterToolsWorkspaceFeed,
} from "./tools.workspace.model";
import * as SharedUi from "@sdkwork/openchat-pc-ui";

type CaseMode = "upper" | "lower" | "title" | "camel";
type HashMode = "md5" | "sha1" | "sha256";
type ModeOption = "encode" | "decode" | "escape" | "unescape" | "toDate" | "toTimestamp" | "auto";

const defaultPasswordOptions: PasswordOptions = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
};

export function ToolsPage() {
  const { tr, formatDateTime } = useAppTranslation();
  const [tools, setTools] = useState<Tool[]>([]);
  const [history, setHistory] = useState<ToolHistory[]>([]);
  const [category, setCategory] = useState<"all" | ToolCategory>("all");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"recommended" | "name">("recommended");
  const [activeToolId, setActiveToolId] = useState<string>("json-formatter");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const [mode, setMode] = useState<ModeOption>("encode");
  const [caseMode, setCaseMode] = useState<CaseMode>("camel");
  const [hashAlgorithm, setHashAlgorithm] = useState<HashMode>("sha256");
  const [paragraphCount, setParagraphCount] = useState(2);
  const [passwordOptions, setPasswordOptions] = useState<PasswordOptions>(defaultPasswordOptions);

  const [favoriteToolIds, setFavoriteToolIds] = useState<string[]>(() => ToolsService.getFavoriteToolIds());
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => ToolsService.getRecentToolIds());

  const formatHistoryTime = (value?: number): string => {
    if (!value) {
      return "-";
    }
    return formatDateTime(value);
  };

  const categoryOptions = useMemo<Array<{ value: "all" | ToolCategory; label: string }>>(
    () => [
      { value: "all", label: tr("All categories") },
      { value: "utility", label: tr("Utility") },
      { value: "converter", label: tr("Converter") },
      { value: "generator", label: tr("Generator") },
      { value: "developer", label: tr("Developer") },
      { value: "ai", label: tr("AI") },
    ],
    [tr],
  );

  const sortOptions = useMemo<Array<{ value: "recommended" | "name"; label: string }>>(
    () => [
      { value: "recommended", label: tr("Recommended") },
      { value: "name", label: tr("Name") },
    ],
    [tr],
  );

  const passwordToggleOptions = useMemo(
    () => [
      { key: "includeUppercase", label: tr("Uppercase") },
      { key: "includeLowercase", label: tr("Lowercase") },
      { key: "includeNumbers", label: tr("Numbers") },
      { key: "includeSymbols", label: tr("Symbols") },
    ] as const,
    [tr],
  );

  const loadTools = async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      const [toolsRes, historyRes] = await Promise.all([
        ToolsResultService.getTools(category === "all" ? undefined : category),
        ToolsResultService.getHistory(),
      ]);
      const loadedTools = toolsRes.data || [];
      setTools(loadedTools);
      setHistory(historyRes.data || []);
      if (loadedTools.length > 0 && !loadedTools.some((item) => item.id === activeToolId)) {
        setActiveToolId(loadedTools[0].id);
      }
    } catch (error) {
      setTools([]);
      setHistory([]);
      setErrorText(error instanceof Error ? error.message : "Failed to load toolbox.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTools();
  }, [category]);

  const workspaceTools = useMemo(
    () =>
      filterToolsWorkspaceFeed(tools, {
        keyword,
        category,
        sortBy,
      }),
    [category, keyword, sortBy, tools],
  );

  const workspaceSummary = useMemo(() => buildToolsWorkspaceSummary(workspaceTools), [workspaceTools]);

  const workspaceLibrary = useMemo(
    () =>
      buildToolsWorkspaceLibrary(tools, {
        favoriteToolIds,
        recentToolIds,
      }),
    [favoriteToolIds, recentToolIds, tools],
  );

  const favoriteSet = useMemo(() => new Set(favoriteToolIds), [favoriteToolIds]);

  const activeTool = useMemo(() => tools.find((item) => item.id === activeToolId) || null, [tools, activeToolId]);

  useEffect(() => {
    if (!activeTool) {
      return;
    }

    setRecentToolIds(ToolsService.markToolOpened(activeTool.id));
    setStatusText("");
    setErrorText(null);
    setOutputText("");
    setInputText("");

    if (activeTool.id === "timestamp") {
      setMode("auto");
    } else if (activeTool.id === "html-escape") {
      setMode("escape");
    } else {
      setMode("encode");
    }
  }, [activeTool]);

  const executionOptions: ToolExecutionOptions = useMemo(() => {
    const options: ToolExecutionOptions = {};

    if (activeTool?.id === "base64" || activeTool?.id === "url-encode") {
      options.mode = mode === "decode" ? "decode" : "encode";
    }
    if (activeTool?.id === "html-escape") {
      options.mode = mode === "unescape" ? "unescape" : "escape";
    }
    if (activeTool?.id === "timestamp") {
      options.mode = mode === "toDate" || mode === "toTimestamp" ? mode : "auto";
    }
    if (activeTool?.id === "case-converter") {
      options.caseMode = caseMode;
    }
    if (activeTool?.id === "password") {
      options.password = passwordOptions;
    }
    if (activeTool?.id === "text-generator") {
      options.paragraphs = paragraphCount;
    }
    if (activeTool?.id === "hash") {
      options.hashAlgorithm = hashAlgorithm;
    }

    return options;
  }, [activeTool?.id, caseMode, hashAlgorithm, mode, paragraphCount, passwordOptions]);

  const runTool = async () => {
    if (!activeTool) {
      return;
    }
    setStatusText("");
    setErrorText(null);
    setIsRunning(true);

    try {
      const result = await ToolsResultService.executeTool(activeTool.id, inputText, executionOptions);
      if (!result.success || !result.data) {
        setErrorText(result.message || result.error || "Tool execution failed.");
        return;
      }

      setOutputText(result.data.output || "");
      if (result.data.notice) {
        setStatusText(result.data.notice);
      }

      await ToolsResultService.addHistory(activeTool.id, activeTool.name, inputText, result.data.output);
      const historyRes = await ToolsResultService.getHistory();
      setHistory(historyRes.data || []);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Tool execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleToggleFavorite = (toolId: string) => {
    ToolsService.toggleFavoriteTool(toolId);
    setFavoriteToolIds(ToolsService.getFavoriteToolIds());
  };

  const canRunWithoutInput = useMemo(
    () => activeTool?.id === "uuid" || activeTool?.id === "password" || activeTool?.id === "text-generator",
    [activeTool?.id],
  );

  const runDisabled = isRunning || (!canRunWithoutInput && !inputText.trim() && activeTool?.id !== "timestamp");

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">{tr("Toolbox")}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tr("Execute utilities, converters, and AI helpers with persistent history.")}
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Current Results")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("Popular")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.popular}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("New")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.newest}</p>
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-4">
            <p className="text-xs text-text-muted">{tr("AI Tools")}</p>
            <p className="mt-1 text-xl font-semibold text-text-primary">{workspaceSummary.ai}</p>
          </div>
        </div>

        <div className="mt-4 grid min-h-[680px] grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
          <aside className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-4">
            <div className="grid grid-cols-1 gap-2">
              <SharedUi.Select
                value={category}
                onChange={(event) => setCategory(event.target.value as "all" | ToolCategory)}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SharedUi.Select>
              <SharedUi.Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={tr("Search tools")}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              />
              <SharedUi.Select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "recommended" | "name")}
                className="h-10 rounded-lg border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
              >
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SharedUi.Select>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-auto">
              {isLoading ? (
                <p className="text-sm text-text-secondary">{tr("Loading tools...")}</p>
              ) : workspaceTools.length === 0 ? (
                <p className="text-sm text-text-secondary">{tr("No tools available.")}</p>
              ) : (
                workspaceTools.map((tool) => (
                  <SharedUi.Button
                    key={tool.id}
                    onClick={() => setActiveToolId(tool.id)}
                    className={`w-full rounded-lg border p-3 text-left ${
                      activeToolId === tool.id
                        ? "border-primary bg-primary-soft/20"
                        : "border-border bg-bg-primary hover:bg-bg-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-text-primary">{tr(tool.name)}</p>
                      <div className="flex items-center gap-1">
                        {favoriteSet.has(tool.id) ? (
                          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] text-warning">{tr("Fav")}</span>
                        ) : null}
                        {tool.isNew ? (
                          <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-white">{tr("New")}</span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">{tr(tool.description)}</p>
                  </SharedUi.Button>
                ))
              )}
            </div>

            <div className="mt-3 rounded-lg border border-border bg-bg-primary p-3">
              <p className="text-xs font-semibold text-text-primary">{tr("Recent History")}</p>
              <div className="mt-2 max-h-28 space-y-1 overflow-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-text-muted">{tr("No records yet.")}</p>
                ) : (
                  history.slice(0, 6).map((item) => (
                    <SharedUi.Button
                      key={item.id}
                      onClick={() => {
                        setActiveToolId(item.toolId);
                        setInputText(item.input || "");
                        setOutputText(item.output || "");
                      }}
                      className="w-full rounded-md px-2 py-1 text-left hover:bg-bg-hover"
                    >
                      <p className="truncate text-[11px] text-text-primary">{tr(item.toolName)}</p>
                      <p className="truncate text-[10px] text-text-muted">{formatHistoryTime(item.createTime)}</p>
                    </SharedUi.Button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-bg-primary p-3 text-[11px]">
              <p className="mb-2 text-xs font-semibold text-text-primary">{tr("Workspace Lanes")}</p>
              <div className="space-y-2">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-text-muted">{tr("Favorites")}</p>
                  {workspaceLibrary.favorites.slice(0, 2).map((item) => (
                    <SharedUi.Button
                      key={`favorite-${item.id}`}
                      onClick={() => setActiveToolId(item.id)}
                      className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                    >
                      {tr(item.name)}
                    </SharedUi.Button>
                  ))}
                  {workspaceLibrary.favorites.length === 0 ? (
                    <p className="text-text-muted">{tr("No favorites yet.")}</p>
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-text-muted">{tr("Recent")}</p>
                  {workspaceLibrary.recent.slice(0, 2).map((item) => (
                    <SharedUi.Button
                      key={`recent-${item.id}`}
                      onClick={() => setActiveToolId(item.id)}
                      className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                    >
                      {tr(item.name)}
                    </SharedUi.Button>
                  ))}
                  {workspaceLibrary.recent.length === 0 ? (
                    <p className="text-text-muted">{tr("No recent history.")}</p>
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-text-muted">{tr("Recommended")}</p>
                  {workspaceLibrary.recommended.slice(0, 2).map((item) => (
                    <SharedUi.Button
                      key={`recommended-${item.id}`}
                      onClick={() => setActiveToolId(item.id)}
                      className="block w-full truncate rounded px-2 py-1 text-left text-text-secondary hover:bg-bg-hover"
                    >
                      {tr(item.name)}
                    </SharedUi.Button>
                  ))}
                  {workspaceLibrary.recommended.length === 0 ? (
                    <p className="text-text-muted">{tr("No recommendations.")}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-4">
            {!activeTool ? (
              <div className="rounded-lg border border-border bg-bg-primary p-5 text-sm text-text-secondary">
                {tr("Select a tool from the left panel.")}
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">{tr(activeTool.name)}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{tr(activeTool.description)}</p>
                  </div>
                  <SharedUi.Button
                    onClick={() => handleToggleFavorite(activeTool.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs ${
                      favoriteSet.has(activeTool.id)
                        ? "border-warning/40 bg-warning/20 text-warning"
                        : "border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {favoriteSet.has(activeTool.id) ? tr("Favorited") : tr("Favorite")}
                  </SharedUi.Button>
                </div>

                {(activeTool.id === "base64" || activeTool.id === "url-encode") && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Mode")}</label>
                    <SharedUi.Select
                      value={mode === "decode" ? "decode" : "encode"}
                      onChange={(event) => setMode(event.target.value as ModeOption)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    >
                      <option value="encode">{tr("Encode")}</option>
                      <option value="decode">{tr("Decode")}</option>
                    </SharedUi.Select>
                  </div>
                )}

                {activeTool.id === "html-escape" && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Mode")}</label>
                    <SharedUi.Select
                      value={mode === "unescape" ? "unescape" : "escape"}
                      onChange={(event) => setMode(event.target.value as ModeOption)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    >
                      <option value="escape">{tr("Escape")}</option>
                      <option value="unescape">{tr("Unescape")}</option>
                    </SharedUi.Select>
                  </div>
                )}

                {activeTool.id === "timestamp" && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Mode")}</label>
                    <SharedUi.Select
                      value={mode}
                      onChange={(event) => setMode(event.target.value as ModeOption)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    >
                      <option value="auto">{tr("Auto Detect")}</option>
                      <option value="toDate">{tr("Timestamp to Date")}</option>
                      <option value="toTimestamp">{tr("Date to Timestamp")}</option>
                    </SharedUi.Select>
                  </div>
                )}

                {activeTool.id === "case-converter" && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Case mode")}</label>
                    <SharedUi.Select
                      value={caseMode}
                      onChange={(event) => setCaseMode(event.target.value as CaseMode)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    >
                      <option value="camel">camelCase</option>
                      <option value="title">{tr("Title Case")}</option>
                      <option value="upper">UPPERCASE</option>
                      <option value="lower">lowercase</option>
                    </SharedUi.Select>
                  </div>
                )}

                {activeTool.id === "hash" && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Hash algorithm")}</label>
                    <SharedUi.Select
                      value={hashAlgorithm}
                      onChange={(event) => setHashAlgorithm(event.target.value as HashMode)}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    >
                      <option value="sha256">SHA-256</option>
                      <option value="sha1">SHA-1</option>
                      <option value="md5">MD5</option>
                    </SharedUi.Select>
                  </div>
                )}

                {activeTool.id === "text-generator" && (
                  <div className="mt-3 w-56">
                    <label className="text-xs text-text-muted">{tr("Paragraph count")}</label>
                    <SharedUi.Input
                      type="number"
                      min={1}
                      max={8}
                      value={paragraphCount}
                      onChange={(event) => setParagraphCount(Math.min(8, Math.max(1, Number(event.target.value) || 2)))}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    />
                  </div>
                )}

                {activeTool.id === "password" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 md:w-[420px]">
                    <label className="col-span-2 text-xs text-text-muted">{tr("Password options")}</label>
                    <SharedUi.Input
                      type="number"
                      min={8}
                      max={64}
                      value={passwordOptions.length}
                      onChange={(event) =>
                        setPasswordOptions((prev) => ({
                          ...prev,
                          length: Math.min(64, Math.max(8, Number(event.target.value) || 16)),
                        }))
                      }
                      className="h-9 rounded-md border border-border bg-bg-tertiary px-2 text-sm text-text-primary"
                    />
                    <div className="col-span-2 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                      {passwordToggleOptions.map((item) => (
                        <label key={item.key} className="flex items-center gap-2">
                          <SharedUi.Input
                            type="checkbox"
                            checked={Boolean(passwordOptions[item.key as keyof PasswordOptions])}
                            onChange={(event) =>
                              setPasswordOptions((prev) => ({
                                ...prev,
                                [item.key]: event.target.checked,
                              }))
                            }
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="flex flex-col">
                    <p className="text-xs text-text-muted">{tr("Input")}</p>
                    <SharedUi.Textarea
                      value={inputText}
                      onChange={(event) => setInputText(event.target.value)}
                      className="mt-2 h-full min-h-[240px] rounded-lg border border-border bg-bg-primary p-3 text-sm text-text-primary"
                      placeholder={tr("Enter content to process")}
                    />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-text-muted">{tr("Output")}</p>
                    <SharedUi.Textarea
                      value={outputText}
                      readOnly
                      className="mt-2 h-full min-h-[240px] rounded-lg border border-border bg-bg-primary p-3 text-sm text-text-primary"
                      placeholder={tr("Result will be shown here")}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <SharedUi.Button
                    onClick={() => {
                      void runTool();
                    }}
                    disabled={runDisabled}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRunning ? tr("Running...") : tr("Run Tool")}
                  </SharedUi.Button>
                  <SharedUi.Button
                    onClick={() => {
                      setInputText("");
                      setOutputText("");
                      setStatusText("");
                      setErrorText(null);
                    }}
                    className="rounded-md border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
                  >
                    {tr("Clear")}
                  </SharedUi.Button>
                </div>

                {statusText ? <p className="mt-2 text-sm text-text-secondary">{tr(statusText)}</p> : null}
                {errorText ? <p className="mt-2 text-sm text-error">{tr(errorText)}</p> : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ToolsPage;
