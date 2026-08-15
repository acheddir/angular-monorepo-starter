import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AppConfig, ConfigService } from "@app/shared/util-config";

@Component({
  selector: "app-root",
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet]
})
export class App {
  private readonly configSvc = inject<ConfigService<AppConfig>>(ConfigService);
}
