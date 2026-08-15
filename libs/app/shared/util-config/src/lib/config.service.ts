import { inject, InjectionToken, isDevMode, Signal, signal } from "@angular/core";

export type ConfigOptions = Record<string, unknown>;
export const CONFIG_OPTIONS = new InjectionToken<ConfigOptions>("CONFIG_OPTIONS", {
  providedIn: "root",
  factory: () => ({})
});

export function injectConfig<T extends object = ConfigOptions>(): ConfigService<T> & T {
  return inject(ConfigService) as ConfigService<T> & T;
}

export class ConfigService<T extends object = ConfigOptions> {
  private readonly options = inject(CONFIG_OPTIONS) as unknown as T;

  constructor() {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        return (target.options as Record<string | symbol, unknown>)[prop];
      }
    });
  }

  public get<K extends keyof T>(key: K): T[K] | undefined {
    if (isDevMode() && !(key in this.options)) {
      console.warn(`[ConfigService] Key "${String(key)}" is missing from configuration`);
    }
    return this.options[key];
  }

  private readonly signals = new Map<keyof T, Signal<unknown>>();

  public select<K extends keyof T>(key: K): Signal<T[K] | undefined> {
    if (!this.signals.has(key)) {
      this.signals.set(key, signal(this.get(key)));
    }
    return this.signals.get(key) as Signal<T[K] | undefined>;
  }

  public getOrDefault<K extends keyof T>(key: K, fallback: T[K]): T[K] {
    return this.options[key] ?? fallback;
  }
}
