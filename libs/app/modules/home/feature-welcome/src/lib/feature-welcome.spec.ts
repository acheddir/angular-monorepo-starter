import { Component, input } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideConfig } from "@app/shared/util-config";

import { Hero } from "../../../ui-hero/src/public-api";
import { FeatureWelcome } from "./feature-welcome";

@Component({
  selector: "app-hero",
  template: "<ng-content />"
})
class MockHero {
  public title = input<string>();
  public subtitle = input<string>();
}

describe("FeatureWelcome", () => {
  let component: FeatureWelcome;
  let fixture: ComponentFixture<FeatureWelcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureWelcome],
      providers: [provideConfig({ environment: "development" })]
    })
      .overrideComponent(FeatureWelcome, {
        remove: { imports: [Hero] },
        add: { imports: [MockHero] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(FeatureWelcome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
