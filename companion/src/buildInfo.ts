interface BuildInfo {
  version: string;
  commit: string;
  environment: "development" | "preview" | "build";
  displayLabel: string | null;
}

// Vite injects only these public values; no runtime environment is exposed.
declare const __GREGULAR_BUILD__: BuildInfo;
export const buildInfo: Readonly<BuildInfo> = __GREGULAR_BUILD__;
