import { TestBed } from "@angular/core/testing";
import { CONFIG_OPTIONS, ConfigService, injectConfig } from "./config.service";
import { provideConfig } from "./providers";

interface AppConfig {
  [key: string]: unknown;
  apiUrl: string;
  featureFlag: boolean;
  maxRetries: number;
  nested: { timeout: number };
}

describe("ConfigService", () => {
  describe("with provideConfig()", () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          ConfigService,
          {
            provide: CONFIG_OPTIONS,
            useValue: {
              apiUrl: "https://api.example.com",
              featureFlag: true,
              maxRetries: 3,
              nested: { timeout: 5000 }
            }
          }
        ]
      });
    });

    it("should be created", () => {
      const service = TestBed.inject(ConfigService);
      expect(service).toBeTruthy();
    });

    it("get() should return the value for a given key", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      expect(service.get("apiUrl")).toBe("https://api.example.com");
      expect(service.get("featureFlag")).toBe(true);
      expect(service.get("maxRetries")).toBe(3);
    });

    it("get() should return nested object values", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      expect(service.get("nested")).toEqual({ timeout: 5000 });
    });

    it("select() should return a signal with the correct value", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      const sig = service.select("apiUrl");
      expect(sig()).toBe("https://api.example.com");
    });

    it("select() should return the same signal instance on repeated calls", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      const sig1 = service.select("featureFlag");
      const sig2 = service.select("featureFlag");
      expect(sig1).toBe(sig2);
    });

    it("select() should return independent signal instances for different keys", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      const sigA = service.select("apiUrl");
      const sigB = service.select("maxRetries");
      expect(sigA).not.toBe(sigB);
    });

    it("proxy should expose config values as direct properties", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig> & AppConfig;
      expect(service.apiUrl).toBe("https://api.example.com");
      expect(service.featureFlag).toBe(true);
      expect(service.maxRetries).toBe(3);
    });

    it("proxy should not shadow existing service methods", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<AppConfig>;
      expect(typeof service.get).toBe("function");
      expect(typeof service.select).toBe("function");
    });
  });

  describe("with default CONFIG_OPTIONS (empty config)", () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [ConfigService]
      });
    });

    it("get() should return undefined for an unknown key", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<any>;
      const val = service.get("nonExistent");
      expect(val).toBeUndefined();
    });

    it("select() should return a signal with undefined for an unknown key", () => {
      const service = TestBed.inject(ConfigService) as ConfigService<any>;
      const sig = service.select("nonExistent");
      expect(sig()).toBeUndefined();
    });
  });

  describe("provideConfig()", () => {
    it("should register CONFIG_OPTIONS with the provided values", () => {
      TestBed.configureTestingModule({
        providers: [
          provideConfig({ environment: "development", apiUrl: "https://api.example.com" })
        ]
      });
      const options = TestBed.inject(CONFIG_OPTIONS);
      expect(options).toEqual({ environment: "development", apiUrl: "https://api.example.com" });
    });

    it("should register ConfigService", () => {
      TestBed.configureTestingModule({
        providers: [provideConfig({ environment: "development" })]
      });
      expect(TestBed.inject(ConfigService)).toBeInstanceOf(ConfigService);
    });

    it("should throw an error when called with invalid arguments", () => {
      expect(() => provideConfig({} as any)).toThrow();
    });
  });

  describe("injectConfig()", () => {
    it("should return the ConfigService instance", () => {
      TestBed.configureTestingModule({
        providers: [
          ConfigService,
          {
            provide: CONFIG_OPTIONS,
            useValue: {
              apiUrl: "https://api.example.com",
              featureFlag: false,
              maxRetries: 1,
              nested: { timeout: 1000 }
            }
          }
        ]
      });
      const config = TestBed.runInInjectionContext(() => injectConfig<AppConfig>());
      expect(config).toBeInstanceOf(ConfigService);
    });

    it("should expose config values via get()", () => {
      TestBed.configureTestingModule({
        providers: [
          ConfigService,
          {
            provide: CONFIG_OPTIONS,
            useValue: {
              apiUrl: "https://api.example.com",
              featureFlag: false,
              maxRetries: 1,
              nested: { timeout: 1000 }
            }
          }
        ]
      });
      const config = TestBed.runInInjectionContext(() => injectConfig<AppConfig>());
      expect(config.get("apiUrl")).toBe("https://api.example.com");
    });

    it("should expose config values as direct properties via the proxy", () => {
      TestBed.configureTestingModule({
        providers: [
          ConfigService,
          {
            provide: CONFIG_OPTIONS,
            useValue: {
              apiUrl: "https://api.example.com",
              featureFlag: false,
              maxRetries: 1,
              nested: { timeout: 1000 }
            }
          }
        ]
      });
      const config = TestBed.runInInjectionContext(() => injectConfig<AppConfig>());
      expect(config.apiUrl).toBe("https://api.example.com");
      expect(config.featureFlag).toBe(false);
    });
  });
});
