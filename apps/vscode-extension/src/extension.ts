import * as vscode from "vscode";
import { registerSchematicsCommands } from "./commands/schematics";
import { registerTaskCommands } from "./commands/tasks";
import { DashboardWebviewPanel } from "./views/dashboardWebview";
import { SidebarProvider } from "./views/sidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "angular-monorepo-assistant" is now active!');

  // Register the full dashboard command
  const dashboardCmd = vscode.commands.registerCommand(
    "angular-monorepo-assistant.openDashboard",
    () => {
      DashboardWebviewPanel.createOrShow(context.extensionUri);
    }
  );
  context.subscriptions.push(dashboardCmd);

  // Register the sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  const sidebarReg = vscode.window.registerWebviewViewProvider(
    SidebarProvider.viewType,
    sidebarProvider
  );
  context.subscriptions.push(sidebarReg);

  // Register task-runner and schematics commands
  registerSchematicsCommands(context);
  registerTaskCommands(context);
}

export function deactivate() {}
