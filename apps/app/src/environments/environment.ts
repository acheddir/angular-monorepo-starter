import { isDevMode } from "@angular/core";
import { EnvironmentConfig } from "./environment.model";
import { provideConfig } from "@app/shared/util-config";

export const environment: EnvironmentConfig = {
  production: !isDevMode(),
  providers: [
    provideConfig({
      apiUrl: import.meta.env.APP_API_URL,
      environment: import.meta.env.APP_ENVIRONMENT
    })
  ]
};

export { type Config } from "@app/shared/types";
