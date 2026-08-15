import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer
} from "@angular/core";
import { OpenFeature, Provider as OpenFeatureProvider } from "@openfeature/web-sdk";

export function provideFeatureFlags(
  providerOrFactory: OpenFeatureProvider | (() => Promise<OpenFeatureProvider>)
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(async (): Promise<void> => {
      try {
        const provider =
          typeof providerOrFactory === "function" ? await providerOrFactory() : providerOrFactory;
        await OpenFeature.setProviderAndWait(provider);
      } catch (err) {
        console.error("[util-feature-flags] Failed to initialize OpenFeature provider:", err);
      }
    })
  ]);
}
