import { EnvironmentProviders } from "@angular/core";

export interface EnvironmentConfig {
  production: boolean;
  providers: EnvironmentProviders[];
}
