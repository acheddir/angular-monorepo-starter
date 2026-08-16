import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}

export function runInTerminal(command: string, name: string = "Monorepo Assistant") {
  const root = getWorkspaceRoot();
  let terminal = vscode.window.terminals.find((t) => t.name === name);
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name,
      cwd: root
    });
  }
  terminal.show(true);
  terminal.sendText(command);
}

export function executeCommand(command: string): Promise<string> {
  const root = getWorkspaceRoot();
  return new Promise((resolve, reject) => {
    cp.exec(command, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        reject(error.message || stderr || stdout);
      } else {
        resolve(stdout);
      }
    });
  });
}
