import * as vscode from "vscode";
import { runInTerminal } from "../utils/workspace";

export function registerTaskCommands(context: vscode.ExtensionContext) {
  const startCmd = vscode.commands.registerCommand("angular-monorepo-assistant.runStart", () => {
    runInTerminal("pnpm start", "Monorepo Dev Server");
  });

  const testCmd = vscode.commands.registerCommand("angular-monorepo-assistant.runTest", () => {
    runInTerminal("pnpm test", "Monorepo Tests");
  });

  const lintCmd = vscode.commands.registerCommand("angular-monorepo-assistant.runLint", () => {
    runInTerminal("pnpm lint", "Monorepo Linting");
  });

  const formatCmd = vscode.commands.registerCommand("angular-monorepo-assistant.runFormat", () => {
    runInTerminal("pnpm format", "Monorepo Prettier");
  });

  context.subscriptions.push(startCmd, testCmd, lintCmd, formatCmd);
}
