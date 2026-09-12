import { chromium as engine } from "playwright";
const chromium = { launch(options = {}) {
  if (process.env.CLR_TEST_GPU !== "1") return engine.launch(options);
  const args = (options.args || []).filter((a) => !a.startsWith("--use-gl=") && !a.startsWith("--use-angle=") && a !== "--enable-unsafe-swiftshader");
  return engine.launch({ ...options, args: [...args, "--use-angle=d3d11", "--ignore-gpu-blocklist"] });
} };
export {
  chromium
};
