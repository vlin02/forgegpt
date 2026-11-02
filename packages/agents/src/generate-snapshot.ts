import { Engine } from "block";
import { pathToFileURL } from "url";
import { resolve } from "path";

async function generateSnapshotURL(solutionPath: string): Promise<string> {
  const absolutePath = resolve(solutionPath);
  const solutionURL = pathToFileURL(absolutePath + "/index.ts").href;

  const solution = await import(solutionURL);
  if (!solution.build || typeof solution.build !== "function") {
    throw new Error(`Solution at ${solutionPath} must export a build function`);
  }

  const engine = new Engine();
  solution.build(engine);

  const snapshot = engine.toURL();
  return `http://localhost:5173/?s=${snapshot}`;
}

const solutionPath = process.argv[2];
if (!solutionPath) {
  console.error("Usage: tsx src/generate-snapshot.ts <solution-path>");
  console.error("Example: tsx src/generate-snapshot.ts solutions/door");
  process.exit(1);
}

generateSnapshotURL(solutionPath)
  .then((url) => {
    console.log(url);
  })
  .catch((err) => {
    console.error("Error generating snapshot:", err.message);
    process.exit(1);
  });
