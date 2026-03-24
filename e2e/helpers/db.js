// @ts-check
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.join(__dirname, "../..");

let _counter = 0;

/** Run a Python script string against the Django project. */
export function django(script) {
  const scriptPath = path.join(root, `_e2e_tmp_${_counter++}.py`);
  const header = `
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "babybuddy.settings.base")
django.setup()
`.trim();

  writeFileSync(scriptPath, `${header}\n${script}`);
  try {
    return execSync(`.venv/bin/python ${scriptPath}`, {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } finally {
    unlinkSync(scriptPath);
  }
}
