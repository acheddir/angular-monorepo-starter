import * as vscode from "vscode";

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "angular-monorepo-sidebar";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "openDashboard":
          vscode.commands.executeCommand("angular-monorepo-assistant.openDashboard");
          break;
        case "runTask":
          if (data.task === "start") {
            vscode.commands.executeCommand("angular-monorepo-assistant.runStart");
          } else if (data.task === "test") {
            vscode.commands.executeCommand("angular-monorepo-assistant.runTest");
          } else if (data.task === "lint") {
            vscode.commands.executeCommand("angular-monorepo-assistant.runLint");
          } else if (data.task === "format") {
            vscode.commands.executeCommand("angular-monorepo-assistant.runFormat");
          }
          break;
      }
    });
  }

  private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background: transparent;
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      padding: 10px;
      margin: 0;
    }

    .header {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }

    .main-btn {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 20px;
      transition: background-color 0.2s;
    }

    .main-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .task-item {
      background: var(--vscode-welcomePage-tileBackground, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--vscode-widget-border, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: border-color 0.2s, background-color 0.2s;
    }

    .task-item:hover {
      border-color: var(--vscode-button-background);
      background: rgba(255, 255, 255, 0.08);
    }

    .task-name {
      font-weight: 500;
    }

    .task-desc {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <button class="main-btn" onclick="openDashboard()">🖥️ Open Full Dashboard</button>

  <div class="header">Quick Server & Tasks</div>
  <div class="task-list">
    <div class="task-item" onclick="runTask('start')">
      <div>
        <div class="task-name">Run Dev Server</div>
        <div class="task-desc">pnpm start</div>
      </div>
      <span>➜</span>
    </div>
    <div class="task-item" onclick="runTask('test')">
      <div>
        <div class="task-name">Run Vitest Suite</div>
        <div class="task-desc">pnpm test</div>
      </div>
      <span>➜</span>
    </div>
    <div class="task-item" onclick="runTask('lint')">
      <div>
        <div class="task-name">Lint Repository</div>
        <div class="task-desc">pnpm lint</div>
      </div>
      <span>➜</span>
    </div>
    <div class="task-item" onclick="runTask('format')">
      <div>
        <div class="task-name">Format Prettier</div>
        <div class="task-desc">pnpm format</div>
      </div>
      <span>➜</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    function openDashboard() {
      vscode.postMessage({ type: 'openDashboard' });
    }

    function runTask(task) {
      vscode.postMessage({ type: 'runTask', task: task });
    }
  </script>
</body>
</html>
`;
  }
}
