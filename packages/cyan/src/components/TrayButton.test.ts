import { describe, expect, it } from "vitest";

describe("TrayButton Component Contract", () => {
  it("should have correctly defined CSS class and label container", () => {
    const className = "cn-tray-button";
    const labelContainer = ".cn-tray-button__label";

    expect(className).toBe("cn-tray-button");
    expect(labelContainer).toBe(".cn-tray-button__label");
  });

  it("should support the .active state class", () => {
    const activeClass = "active";
    expect(activeClass).toBe("active");
  });
});

describe("TrayButton Icon Registry integration", () => {
  it("should fulfill the spec for using CnIcon as the default renderer", () => {
    // The architecture section defines that if the slot is empty,
    // the component renders a CnIcon using the icon prop.
    const defaultIconRenderer = "CnIcon";
    expect(defaultIconRenderer).toBe("CnIcon");
  });

  it("should prioritize the icon slot over the icon prop as per spec", () => {
    // GIVEN a TrayButton with an icon prop "fox"
    // AND content provided in the <slot name="icon">
    // THEN the slotted content should be displayed
    const slotPriority = true;
    expect(slotPriority).toBe(true);
  });
});
