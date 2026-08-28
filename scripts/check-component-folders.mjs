#!/usr/bin/env node
/*
 * Mechanises CONVENTIONS.md's "every component is a folder, not a loose file" rule: a component
 * folder must hold a `.tsx` file named after itself. Mirrors scripts/check-no-play-functions.mjs's
 * file-scanning shape.
 */
import { existsSync, globSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

/** The three component roots CONVENTIONS.md's placement rule names, and nothing else. */
const COMPONENT_FOLDER_PATTERNS = ["src/components/ui/*", "src/components/layout/*", "src/features/*/components/*"];

/*
 * A screenshot baseline directory is created by the test runner beside the component it covers and
 * is shaped exactly like a component folder — excluded here for the same reason
 * `glob-real-files.mjs` exists (docs/adr/tech/0023).
 */
const isGeneratedFolder = ({ folderName }) => {
    return folderName === "__screenshots__";
};

export const findFolderNameViolations = ({ folders, folderHasOwnComponent }) => {
    return folders
        .filter((relativePath) => {
            return !isGeneratedFolder({ folderName: path.basename(relativePath) });
        })
        .filter((relativePath) => {
            return !folderHasOwnComponent(relativePath);
        })
        .map((relativePath) => {
            return { relativePath, expected: `${relativePath}/${path.basename(relativePath)}.tsx` };
        });
};

const globComponentFolders = () => {
    const matches = new Set(COMPONENT_FOLDER_PATTERNS.flatMap((pattern) => globSync(pattern, { cwd: repoRoot })));

    return [...matches].filter((relativePath) => {
        try {
            return statSync(path.resolve(repoRoot, relativePath)).isDirectory();
        } catch {
            return false;
        }
    });
};

const runCli = () => {
    const violations = findFolderNameViolations({
        folders: globComponentFolders(),
        folderHasOwnComponent: (relativePath) => {
            return existsSync(path.resolve(repoRoot, relativePath, `${path.basename(relativePath)}.tsx`));
        },
    }).sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    if (violations.length > 0) {
        console.error(
            "folders:check failed — a component folder holds no component named after it. " +
                "CONVENTIONS.md requires `<name>/<name>.tsx` so a stack trace or editor tab says which " +
                "component it is, and never an `index.tsx`.\n",
        );
        for (const violation of violations) {
            console.error(`  ${violation.relativePath}/ — expected ${violation.expected}`);
        }
        process.exit(1);
    }

    console.log("folders:check passed — every component folder holds a component named after it.");
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    runCli();
}
