import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot, executeCommand, runInTerminal } from "../utils/workspace";
import { parseSheriffConfig, writeSheriffConfig, SheriffRules } from "../utils/sheriffParser";

export class DashboardWebviewPanel {
  public static currentPanel: DashboardWebviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DashboardWebviewPanel.currentPanel) {
      DashboardWebviewPanel.currentPanel._panel.reveal(column);
      DashboardWebviewPanel.currentPanel._updateData();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "monorepoDashboard",
      "Monorepo Assistant Dashboard",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    DashboardWebviewPanel.currentPanel = new DashboardWebviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtmlForWebview();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "ready":
            this._updateData();
            break;
          case "runTask":
            this._handleRunTask(message.task, message.args);
            break;
          case "saveSheriff":
            this._handleSaveSheriff(message.rules);
            break;
          case "saveFlags":
            this._handleSaveFlags(message.config);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    DashboardWebviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _updateData() {
    const root = getWorkspaceRoot();
    if (!root) {
      this._panel.webview.postMessage({ type: "error", message: "No workspace opened" });
      return;
    }

    let sheriffRules: SheriffRules = {};
    let sheriffError: string | null = null;
    const sheriffPath = path.join(root, "sheriff.config.ts");
    try {
      if (fs.existsSync(sheriffPath)) {
        const parsed = parseSheriffConfig(sheriffPath);
        sheriffRules = parsed.rules;
      } else {
        sheriffError = "sheriff.config.ts not found";
      }
    } catch (err: any) {
      sheriffError = err.message || "Failed to parse Sheriff config";
    }

    let flagsConfig: any = {};
    let flagsError: string | null = null;
    const flagsPath = path.join(root, "apps", "app", "public", "flagsConfig.json");
    try {
      if (fs.existsSync(flagsPath)) {
        flagsConfig = JSON.parse(fs.readFileSync(flagsPath, "utf-8"));
      } else {
        flagsError = "flagsConfig.json not found under apps/app/public/";
      }
    } catch (err: any) {
      flagsError = err.message || "Failed to parse Feature Flags configuration";
    }

    this._panel.webview.postMessage({
      type: "load",
      sheriff: { rules: sheriffRules, error: sheriffError },
      flags: { config: flagsConfig, error: flagsError }
    });
  }

  private _handleRunTask(task: string, args?: any) {
    if (task === "start") {
      vscode.commands.executeCommand("angular-monorepo-assistant.runStart");
    } else if (task === "test") {
      vscode.commands.executeCommand("angular-monorepo-assistant.runTest");
    } else if (task === "test:ui") {
      runInTerminal("pnpm test:ui", "Monorepo Tests UI");
    } else if (task === "lint") {
      vscode.commands.executeCommand("angular-monorepo-assistant.runLint");
    } else if (task === "format") {
      vscode.commands.executeCommand("angular-monorepo-assistant.runFormat");
    } else if (task === "generateSchematic") {
      let cmd = `pnpm ng generate @tools/schematics:${args.type} --app=${args.app || "app"}`;
      if (args.shared) {
        cmd += " --shared";
      } else if (args.domain) {
        cmd += ` --domain=${args.domain}`;
      }

      if (args.name && args.type !== "data" && args.type !== "types") {
        cmd += ` --name=${args.name}`;
      }

      if (args.type === "domain" || args.type === "feature") {
        if (args.routing) cmd += " --routing";
        if (args.navigation) cmd += " --navigation";
      }
      runInTerminal(cmd, "Monorepo Schematics");
    }
  }

  private _handleSaveSheriff(rules: SheriffRules) {
    const root = getWorkspaceRoot();
    if (!root) return;
    const sheriffPath = path.join(root, "sheriff.config.ts");
    try {
      const original = fs.readFileSync(sheriffPath, "utf-8");
      writeSheriffConfig(sheriffPath, rules, original);
      vscode.window.showInformationMessage("Sheriff boundaries updated successfully!");
      this._updateData();
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to save Sheriff boundaries: ${err.message}`);
    }
  }

  private _handleSaveFlags(config: any) {
    const root = getWorkspaceRoot();
    if (!root) return;
    const flagsPath = path.join(root, "apps", "app", "public", "flagsConfig.json");
    try {
      fs.writeFileSync(flagsPath, JSON.stringify(config, null, 2), "utf-8");
      vscode.window.showInformationMessage("Feature Flags configuration updated successfully!");
      this._updateData();
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to save Feature Flags: ${err.message}`);
    }
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Angular Monorepo Assistant</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient-start: #0f172a;
      --bg-gradient-end: #020617;
      --card-bg: rgba(30, 41, 59, 0.45);
      --card-border: rgba(255, 255, 255, 0.08);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-color: #06b6d4;
      --accent-color-hover: #22d3ee;
      --success-color: #10b981;
      --danger-color: #ef4444;
      --tab-bg-active: rgba(6, 182, 212, 0.15);
      --input-bg: rgba(15, 23, 42, 0.8);
      --font-stack: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
      min-height: 100vh;
      font-family: var(--font-stack);
      color: var(--text-main);
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }

    header {
      margin-bottom: 2.5rem;
      text-align: left;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }

    .brand-title {
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(to right, #38bdf8, var(--accent-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.025em;
    }

    .brand-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      font-weight: 400;
    }

    .nav-tabs {
      display: flex;
      gap: 0.75rem;
      background: rgba(15, 23, 42, 0.4);
      padding: 0.375rem;
      border-radius: 0.75rem;
      border: 1px solid var(--card-border);
      width: fit-content;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.625rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 500;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.03);
    }

    .tab-btn.active {
      color: var(--accent-color);
      background: var(--tab-bg-active);
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.4s ease;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards Styling */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25), 0 0 15px rgba(6, 182, 212, 0.05);
      border-color: rgba(6, 182, 212, 0.25);
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-main);
    }

    /* Buttons */
    .btn {
      background: linear-gradient(135deg, var(--accent-color), #0891b2);
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
    }

    .btn:hover {
      background: linear-gradient(135deg, var(--accent-color-hover), #0e7490);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
    }

    .btn-secondary {
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid var(--card-border);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      background: rgba(71, 85, 105, 0.6);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: none;
    }

    .btn-danger {
      background: linear-gradient(135deg, var(--danger-color), #dc2626);
    }
    .btn-danger:hover {
      background: linear-gradient(135deg, #f87171, #b91c1c);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }

    /* Inputs */
    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .input-control {
      background: var(--input-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.5rem;
      padding: 0.625rem 0.875rem;
      color: var(--text-main);
      font-family: var(--font-stack);
      font-size: 0.9rem;
      width: 100%;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .input-control:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
    }

    /* Switch toggle */
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(71, 85, 105, 0.6);
      transition: .3s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--success-color);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    /* Sheriff Matrix visual editor */
    .matrix-wrapper {
      overflow-x: auto;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-top: 1.5rem;
    }

    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .matrix-table th, .matrix-table td {
      padding: 0.75rem 1rem;
      font-size: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .matrix-table th {
      color: var(--text-muted);
      font-weight: 600;
      white-space: nowrap;
    }

    .matrix-table td.tag-name {
      font-weight: 500;
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.02);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    .matrix-table tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }

    .checkbox-cell {
      text-align: center;
    }

    .checkbox-cell input[type="checkbox"] {
      accent-color: var(--accent-color);
      cursor: pointer;
      width: 16px;
      height: 16px;
    }

    .matrix-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    /* Feature Flags tab styles */
    .flags-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .flag-card {
      background: rgba(30, 41, 59, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
    }

    .flag-card:hover {
      border-color: rgba(6, 182, 212, 0.15);
      background: rgba(30, 41, 59, 0.45);
    }

    .flag-info {
      flex: 1;
    }

    .flag-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      color: var(--text-main);
    }

    .flag-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      gap: 1rem;
    }

    .flag-control {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .flag-variant-select {
      background: var(--input-bg);
      color: var(--text-main);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.85rem;
      outline: none;
    }

    .trash-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      transition: color 0.2s, background-color 0.2s;
    }

    .trash-btn:hover {
      color: var(--danger-color);
      background: rgba(239, 68, 68, 0.1);
    }

    .add-flag-form {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .variant-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .variant-row input {
      flex: 1;
    }

    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 0.25rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }

    .status-badge.error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--danger-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1 class="brand-title">Angular Monorepo Assistant</h1>
        <div class="brand-subtitle">Manage code generation, Sheriff boundaries, and OpenFeature flags</div>
      </div>
      <div class="nav-tabs">
        <button class="tab-btn active" onclick="switchTab('dashboard')">Dashboard</button>
        <button class="tab-btn" onclick="switchTab('sheriff')">Sheriff Boundaries</button>
        <button class="tab-btn" onclick="switchTab('flags')">Feature Flags</button>
      </div>
    </header>

    <!-- DASHBOARD TAB -->
    <div id="dashboard-tab" class="tab-content active">
      <h2 style="font-size: 1.4rem; font-weight: 600; margin-bottom: 1.25rem;">Tasks & Code Generators</h2>
      
      <div class="grid">
        <!-- Developer Tasks Card -->
        <div class="card">
          <h3 class="card-title">🚀 Development Tasks</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">Launch servers, run analysis tools, lint code, or check workspace boundaries.</p>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <button class="btn" onclick="runTask('start')">Start Dev Server</button>
            <button class="btn btn-secondary" onclick="runTask('test')">Run Tests (Vitest)</button>
            <button class="btn btn-secondary" onclick="runTask('test:ui')">Open Vitest UI</button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <button class="btn btn-secondary" onclick="runTask('lint')">Lint Code</button>
              <button class="btn btn-secondary" onclick="runTask('format')">Format Code</button>
            </div>
          </div>
        </div>

        <!-- Unified Schematic Generator Card -->
        <div class="card">
          <h3 class="card-title">📦 Visual Schematic Generator</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">Generate shared libraries, ui components, utils, data, types, features, or full domains.</p>
          
          <div class="form-group">
            <label for="sch-type">Schematic Type</label>
            <select id="sch-type" class="input-control" onchange="onSchematicTypeChange()">
              <option value="domain">Full Domain (feature, data, types)</option>
              <option value="feature">Feature Component (smart component)</option>
              <option value="ui">UI Component Library (presentational component)</option>
              <option value="data">Data Access Library (services, state)</option>
              <option value="util">Utility Library (helpers)</option>
              <option value="types">Types/Models Library</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="sch-app">App Name</label>
            <input type="text" id="sch-app" class="input-control" value="app">
          </div>
          
          <div class="form-group" id="sch-shared-group" style="display: none;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="sch-shared" onchange="onSchematicTypeChange()" style="accent-color: var(--accent-color);"> Create as Shared Library (under shared/)
            </label>
          </div>
          
          <div class="form-group" id="sch-domain-group">
            <label for="sch-domain">Domain Name</label>
            <input type="text" id="sch-domain" class="input-control" placeholder="e.g. products, orders">
          </div>
          
          <div class="form-group" id="sch-name-group">
            <label for="sch-name">Initial Feature Name</label>
            <input type="text" id="sch-name" class="input-control" placeholder="e.g. list, details, date-helpers">
          </div>
          
          <div id="sch-routing-container" style="display: flex; gap: 1.5rem; margin-bottom: 1.25rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="sch-routing" checked style="accent-color: var(--accent-color);"> Add Route
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
              <input type="checkbox" id="sch-nav" checked style="accent-color: var(--accent-color);"> Add to Nav
            </label>
          </div>
          
          <button class="btn" onclick="generateSchematic()">Generate Schematic</button>
        </div>
      </div>
    </div>

    <!-- SHERIFF BOUNDARIES TAB -->
    <div id="sheriff-tab" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.4rem; font-weight: 600; margin: 0;">Sheriff Module Boundaries</h2>
        <div id="sheriff-status"></div>
      </div>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">
        Visually configure module import capabilities. Rows represent importing modules (source tag); columns represent imported modules (target tag).
      </p>

      <div class="matrix-wrapper">
        <table class="matrix-table" id="sheriff-matrix">
          <!-- Dynamically populated -->
        </table>
      </div>

      <div class="matrix-actions">
        <button class="btn btn-secondary" style="width: auto;" onclick="addNewSheriffTag()">Add New Tag Row</button>
        <button class="btn" style="width: auto;" onclick="saveSheriffConfig()">Save Boundaries</button>
      </div>
    </div>

    <!-- FEATURE FLAGS TAB -->
    <div id="flags-tab" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.4rem; font-weight: 600; margin: 0;">OpenFeature Flags</h2>
        <div id="flags-status"></div>
      </div>
      <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; margin-bottom: 1.5rem;">
        Add, remove, toggle, or configure default variants for feature flags in <code>flagsConfig.json</code>.
      </p>

      <!-- Add Flag Form -->
      <div class="add-flag-form">
        <h3 style="font-size: 1.05rem; font-weight: 600; margin-top: 0; margin-bottom: 1rem; color: var(--text-main);">➕ Create New Feature Flag</h3>
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label for="new-flag-name">Flag Key (camelCase)</label>
            <input type="text" id="new-flag-name" class="input-control" placeholder="e.g. promoBanner">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="new-flag-default">Default Variant</label>
            <input type="text" id="new-flag-default" class="input-control" value="on">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="new-flag-disabled">Disabled initially</label>
            <select id="new-flag-disabled" class="input-control">
              <option value="false">No (Active)</option>
              <option value="true">Yes (Disabled)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label style="margin-bottom: 0.25rem;">Variants (Key-Value pairs)</label>
          <div id="new-flag-variants-container">
            <div class="variant-row">
              <input type="text" class="input-control var-name" placeholder="Variant Name (e.g. on)" value="on">
              <input type="text" class="input-control var-val" placeholder="Value (e.g. true)" value="true">
            </div>
            <div class="variant-row">
              <input type="text" class="input-control var-name" placeholder="Variant Name (e.g. off)" value="off">
              <input type="text" class="input-control var-val" placeholder="Value (e.g. false)" value="false">
            </div>
          </div>
          <button class="btn btn-secondary" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.8rem; margin-top: 0.5rem;" onclick="addNewVariantInput()">+ Add Variant Row</button>
        </div>

        <button class="btn" style="width: auto;" onclick="addFeatureFlag()">Add Feature Flag</button>
      </div>

      <!-- Flags List -->
      <div id="flags-container" class="flags-list">
        <!-- Dynamically populated -->
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
        <button class="btn" style="width: auto;" onclick="saveFeatureFlags()">Save Feature Flags</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let sheriffRules = {};
    let flagsConfig = {};

    // Notify extension we are ready
    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'ready' });
      onSchematicTypeChange();
    });

    // Handle messages from Extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'load') {
        renderSheriff(msg.sheriff);
        renderFeatureFlags(msg.flags);
      } else if (msg.type === 'error') {
        alert(msg.message);
      }
    });

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      // Find trigger button and activate it
      const btnIndex = tabId === 'dashboard' ? 0 : tabId === 'sheriff' ? 1 : 2;
      document.querySelectorAll('.tab-btn')[btnIndex].classList.add('active');
      document.getElementById(tabId + '-tab').classList.add('active');
    }

    function runTask(task, args = null) {
      vscode.postMessage({ command: 'runTask', task, args });
    }

    function onSchematicTypeChange() {
      const type = document.getElementById('sch-type').value;
      
      const domainGroup = document.getElementById('sch-domain-group');
      const nameGroup = document.getElementById('sch-name-group');
      const sharedGroup = document.getElementById('sch-shared-group');
      const routingContainer = document.getElementById('sch-routing-container');

      // Shared checkbox option is only available for types, ui, util, data
      if (type === 'types' || type === 'ui' || type === 'util' || type === 'data') {
        sharedGroup.style.display = 'block';
      } else {
        sharedGroup.style.display = 'none';
        document.getElementById('sch-shared').checked = false;
      }

      // Domain input is visible only if not shared
      const isShared = document.getElementById('sch-shared').checked;
      if (isShared) {
        domainGroup.style.display = 'none';
      } else {
        domainGroup.style.display = 'block';
      }

      // Name input: not needed for 'data' or 'types'
      if (type === 'data' || type === 'types') {
        nameGroup.style.display = 'none';
      } else {
        nameGroup.style.display = 'block';
        const label = nameGroup.querySelector('label');
        if (type === 'feature') {
          label.textContent = 'Feature Component Name';
        } else if (type === 'ui') {
          label.textContent = 'UI Component Name';
        } else if (type === 'util') {
          label.textContent = 'Utility Library Name';
        } else {
          label.textContent = 'Initial Feature Name';
        }
      }

      // Routing/navigation are only available for domain and feature
      if (type === 'domain' || type === 'feature') {
        routingContainer.style.display = 'flex';
      } else {
        routingContainer.style.display = 'none';
      }
    }

    function generateSchematic() {
      const type = document.getElementById('sch-type').value;
      const app = document.getElementById('sch-app').value.trim();
      const isShared = document.getElementById('sch-shared').checked;
      const domain = document.getElementById('sch-domain').value.trim();
      const name = document.getElementById('sch-name').value.trim();
      const routing = document.getElementById('sch-routing').checked;
      const navigation = document.getElementById('sch-nav').checked;

      if (!isShared && !domain) {
        alert("Domain name is required when not creating a shared library");
        return;
      }
      
      if (type !== 'data' && type !== 'types' && !name) {
        alert("Library/Component name is required");
        return;
      }

      runTask('generateSchematic', { type, app, shared: isShared, domain, name, routing, navigation });
    }

    // --- SHERIFF BOUNDARIES MATRIX RENDER ---
    function renderSheriff(sheriffData) {
      const statusDiv = document.getElementById('sheriff-status');
      if (sheriffData.error) {
        statusDiv.innerHTML = '<span class="status-badge error">Error loading: ' + sheriffData.error + '</span>';
        document.getElementById('sheriff-matrix').innerHTML = '<tr><td>Could not load boundaries: ' + sheriffData.error + '</td></tr>';
        return;
      }
      statusDiv.innerHTML = '<span class="status-badge">Loaded</span>';
      sheriffRules = sheriffData.rules;

      // Extract unique tags
      const rowTags = Object.keys(sheriffRules);
      
      // Collect all possible targets: all row keys, plus sameTag and *
      const colTagsSet = new Set(['sameTag', '*']);
      rowTags.forEach(t => colTagsSet.add(t));
      // Add other common tags that might be referenced
      Object.values(sheriffRules).forEach(deps => {
        deps.forEach(dep => colTagsSet.add(dep));
      });
      const colTags = Array.from(colTagsSet);

      const table = document.getElementById('sheriff-matrix');
      table.innerHTML = '';

      // Header row
      const headerRow = document.createElement('tr');
      const thCorner = document.createElement('th');
      thCorner.textContent = 'Allows Import Of ➜';
      headerRow.appendChild(thCorner);

      colTags.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      });
      table.appendChild(headerRow);

      // Rule rows
      rowTags.forEach(row => {
        const tr = document.createElement('tr');
        const tdTag = document.createElement('td');
        tdTag.className = 'tag-name';
        tdTag.textContent = row;
        tr.appendChild(tdTag);

        colTags.forEach(col => {
          const tdCheckbox = document.createElement('td');
          tdCheckbox.className = 'checkbox-cell';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = sheriffRules[row] && sheriffRules[row].includes(col);
          cb.onchange = (e) => {
            if (e.target.checked) {
              if (!sheriffRules[row].includes(col)) {
                sheriffRules[row].push(col);
              }
            } else {
              sheriffRules[row] = sheriffRules[row].filter(x => x !== col);
            }
          };
          tdCheckbox.appendChild(cb);
          tr.appendChild(tdCheckbox);
        });

        table.appendChild(tr);
      });
    }

    function addNewSheriffTag() {
      const newTag = prompt("Enter new tag name (e.g. type:service, domain:billing):");
      if (!newTag) return;
      if (sheriffRules[newTag]) {
        alert("Tag already exists!");
        return;
      }
      sheriffRules[newTag] = ['sameTag'];
      renderSheriff({ rules: sheriffRules, error: null });
    }

    function saveSheriffConfig() {
      vscode.postMessage({ command: 'saveSheriff', rules: sheriffRules });
    }

    // --- FEATURE FLAGS RENDER ---
    function renderFeatureFlags(flagsData) {
      const statusDiv = document.getElementById('flags-status');
      if (flagsData.error) {
        statusDiv.innerHTML = '<span class="status-badge error">Error loading: ' + flagsData.error + '</span>';
        document.getElementById('flags-container').innerHTML = '<div>Could not load flags: ' + flagsData.error + '</div>';
        return;
      }
      statusDiv.innerHTML = '<span class="status-badge">Loaded</span>';
      flagsConfig = flagsData.config;

      const container = document.getElementById('flags-container');
      container.innerHTML = '';

      Object.entries(flagsConfig).forEach(([flagKey, value]) => {
        const card = document.createElement('div');
        card.className = 'flag-card';

        const info = document.createElement('div');
        info.className = 'flag-info';
        
        const title = document.createElement('h4');
        title.className = 'flag-name';
        title.textContent = flagKey;
        info.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'flag-meta';

        const defaultSpan = document.createElement('span');
        defaultSpan.innerHTML = '<strong>Default:</strong> ' + value.defaultVariant;
        meta.appendChild(defaultSpan);

        const variantsSpan = document.createElement('span');
        const vars = Object.entries(value.variants || {}).map(([v, val]) => v + ' (' + val + ')').join(', ');
        variantsSpan.innerHTML = '<strong>Variants:</strong> ' + vars;
        meta.appendChild(variantsSpan);

        info.appendChild(meta);
        card.appendChild(info);

        const control = document.createElement('div');
        control.className = 'flag-control';

        // Disabled switch
        const label = document.createElement('label');
        label.className = 'switch';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !value.disabled;
        checkbox.onchange = (e) => {
          flagsConfig[flagKey].disabled = !e.target.checked;
        };
        const slider = document.createElement('span');
        slider.className = 'slider';
        label.appendChild(checkbox);
        label.appendChild(slider);
        control.appendChild(label);

        // Default Variant selector
        const select = document.createElement('select');
        select.className = 'flag-variant-select';
        Object.keys(value.variants || {}).forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          if (v === value.defaultVariant) {
            opt.selected = true;
          }
          select.appendChild(opt);
        });
        select.onchange = (e) => {
          flagsConfig[flagKey].defaultVariant = e.target.value;
        };
        control.appendChild(select);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.className = 'trash-btn';
        delBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        delBtn.onclick = () => {
          if (confirm('Are you sure you want to delete flag "' + flagKey + '"?')) {
            delete flagsConfig[flagKey];
            renderFeatureFlags({ config: flagsConfig, error: null });
          }
        };
        control.appendChild(delBtn);

        card.appendChild(control);
        container.appendChild(card);
      });
    }

    function addNewVariantInput() {
      const container = document.getElementById('new-flag-variants-container');
      const row = document.createElement('div');
      row.className = 'variant-row';
      
      const inputName = document.createElement('input');
      inputName.type = 'text';
      inputName.className = 'input-control var-name';
      inputName.placeholder = 'Variant Name';

      const inputVal = document.createElement('input');
      inputVal.type = 'text';
      inputVal.className = 'input-control var-val';
      inputVal.placeholder = 'Value (e.g. true, red, 10)';

      row.appendChild(inputName);
      row.appendChild(inputVal);
      container.appendChild(row);
    }

    function addFeatureFlag() {
      const key = document.getElementById('new-flag-name').value.trim();
      const defVariant = document.getElementById('new-flag-default').value.trim();
      const isDisabled = document.getElementById('new-flag-disabled').value === 'true';

      if (!key) {
        alert("Flag key is required");
        return;
      }
      if (flagsConfig[key]) {
        alert("Flag key already exists!");
        return;
      }

      const variantRows = document.querySelectorAll('#new-flag-variants-container .variant-row');
      const variants = {};

      variantRows.forEach(row => {
        const name = row.querySelector('.var-name').value.trim();
        let valRaw = row.querySelector('.var-val').value.trim();
        if (name) {
          // Parse value (boolean, number, string)
          let val = valRaw;
          if (valRaw === 'true') val = true;
          else if (valRaw === 'false') val = false;
          else if (!isNaN(valRaw) && valRaw !== '') val = Number(valRaw);
          variants[name] = val;
        }
      });

      if (!variants[defVariant]) {
        alert("Default variant must be one of the variants listed below!");
        return;
      }

      flagsConfig[key] = {
        defaultVariant: defVariant,
        disabled: isDisabled,
        variants: variants
      };

      // Reset form
      document.getElementById('new-flag-name').value = '';
      document.getElementById('new-flag-default').value = 'on';
      document.getElementById('new-flag-variants-container').innerHTML = \`
        <div class="variant-row">
          <input type="text" class="input-control var-name" placeholder="Variant Name" value="on">
          <input type="text" class="input-control var-val" placeholder="Value" value="true">
        </div>
        <div class="variant-row">
          <input type="text" class="input-control var-name" placeholder="Variant Name" value="off">
          <input type="text" class="input-control var-val" placeholder="Value" value="false">
        </div>
      \`;

      renderFeatureFlags({ config: flagsConfig, error: null });
    }

    function saveFeatureFlags() {
      vscode.postMessage({ command: 'saveFlags', config: flagsConfig });
    }
  </script>
</body>
</html>
`;
  }
}
