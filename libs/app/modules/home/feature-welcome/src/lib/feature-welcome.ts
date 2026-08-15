import { Component } from "@angular/core";
import { injectConfig } from "@app/shared/util-config";
import { Config } from "@app/shared/types";
import { Hero } from "@app/home/ui-hero";
import { BooleanFeatureFlagDirective } from "@openfeature/angular-sdk";

@Component({
  selector: "app-feature-welcome",
  imports: [Hero, BooleanFeatureFlagDirective],
  templateUrl: "./feature-welcome.html",
  styles: ``
})
export class FeatureWelcome {
  private readonly cfg = injectConfig<Config>();

  public readonly apiUrl = this.cfg.apiUrl;
}
