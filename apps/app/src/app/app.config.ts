import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  provideAppInitializer
} from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { routes } from "@app/shell";
import { environment } from "@app/environment";
import { provideOpenFeature } from "@openfeature/angular-sdk";
import {
  TypedInMemoryProvider,
  type InMemoryFlagConfiguration,
  type InMemoryFlagVariants
} from "@openfeature/web-sdk";

const featureProvider = new TypedInMemoryProvider();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    //provideAuth(authConfig),
    ...environment.providers,
    provideOpenFeature({ provider: featureProvider }),
    provideAppInitializer(() =>
      fetch("/flagsConfig.json")
        .then((res) => res.json())
        .then((config) =>
          featureProvider.putConfiguration(
            config as InMemoryFlagConfiguration<Record<string, InMemoryFlagVariants<string>>>
          )
        )
    )
  ]
};
