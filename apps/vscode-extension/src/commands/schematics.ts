import * as vscode from "vscode";
import { runInTerminal } from "../utils/workspace";

function getDomainFromUri(uri?: vscode.Uri): string | undefined {
  if (!uri) return undefined;
  const fsPath = uri.fsPath;
  const normalized = fsPath.replace(/\\/g, "/");
  const match = normalized.match(/\/libs\/[^/]+\/modules\/([^/]+)/);
  return match ? match[1] : undefined;
}

export function registerSchematicsCommands(context: vscode.ExtensionContext): void {
  // 1. Generate Domain
  const genDomain = vscode.commands.registerCommand(
    "angular-monorepo-assistant.generateDomain",
    async (uri?: vscode.Uri) => {
      const defaultDomain = getDomainFromUri(uri);

      const appName = await vscode.window.showInputBox({
        prompt: "Enter the App name",
        value: "app"
      });
      if (appName === undefined) return;

      const domainName = await vscode.window.showInputBox({
        prompt: "Enter the Domain name",
        value: defaultDomain || "",
        placeHolder: "e.g., products, orders"
      });
      if (!domainName) return;

      const featureName = await vscode.window.showInputBox({
        prompt: "Enter the initial Feature name",
        value: "list",
        placeHolder: "e.g., list, details"
      });
      if (!featureName) return;

      const routingOpt = await vscode.window.showQuickPick(["Yes", "No"], {
        placeHolder: "Add lazy-loaded route?"
      });
      if (routingOpt === undefined) return;

      const navigationOpt = await vscode.window.showQuickPick(["Yes", "No"], {
        placeHolder: "Add to navigation menu?"
      });
      if (navigationOpt === undefined) return;

      let cmd = `pnpm ng generate @tools/schematics:domain --app=${appName} --domain=${domainName} --name=${featureName}`;
      if (routingOpt === "Yes") {
        cmd += " --routing";
      }
      if (navigationOpt === "Yes") {
        cmd += " --navigation";
      }

      runInTerminal(cmd, "Monorepo Schematics");
    }
  );

  // 2. Generate Feature Component
  const genFeature = vscode.commands.registerCommand(
    "angular-monorepo-assistant.generateFeature",
    async (uri?: vscode.Uri) => {
      const defaultDomain = getDomainFromUri(uri);

      const appName = await vscode.window.showInputBox({
        prompt: "Enter the App name",
        value: "app"
      });
      if (appName === undefined) return;

      const domainName = await vscode.window.showInputBox({
        prompt: "Enter the Domain name",
        value: defaultDomain || "",
        placeHolder: "e.g., products, orders"
      });
      if (!domainName) return;

      const featureName = await vscode.window.showInputBox({
        prompt: "Enter the Feature component name",
        placeHolder: "e.g., detail, checkout"
      });
      if (!featureName) return;

      const routingOpt = await vscode.window.showQuickPick(["Yes", "No"], {
        placeHolder: "Add lazy-loaded route?"
      });
      if (routingOpt === undefined) return;

      const navigationOpt = await vscode.window.showQuickPick(["Yes", "No"], {
        placeHolder: "Add to navigation menu?"
      });
      if (navigationOpt === undefined) return;

      let cmd = `pnpm ng generate @tools/schematics:feature --app=${appName} --domain=${domainName} --name=${featureName}`;
      if (routingOpt === "Yes") {
        cmd += " --routing";
      }
      if (navigationOpt === "Yes") {
        cmd += " --navigation";
      }

      runInTerminal(cmd, "Monorepo Schematics");
    }
  );

  context.subscriptions.push(genDomain, genFeature);
}
