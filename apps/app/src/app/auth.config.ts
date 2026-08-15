import { AuthConfig } from "angular-oauth2-oidc";
import { isDevMode } from "@angular/core";

const isBrowser = typeof window !== "undefined";

export const authConfig: AuthConfig = {
  issuer: import.meta.env.APP_AUTH_ISSUER,
  redirectUri: isBrowser ? window.location.origin + "/callback" : "",
  clientId: import.meta.env.APP_AUTH_CLIENTID,
  responseType: "code",
  scope: "openid profile email offline_access",
  showDebugInformation: isDevMode(),
  requireHttps: !isDevMode(),
  useSilentRefresh: true,
  silentRefreshTimeout: 10000,
  timeoutFactor: 0.75,
  sessionChecksEnabled: false
};
