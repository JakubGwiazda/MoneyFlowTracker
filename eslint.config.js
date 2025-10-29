import { includeIgnoreFile } from "@eslint/compat";
import eslint from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import angular from "@angular-eslint/eslint-plugin";
import angularTemplate from "@angular-eslint/eslint-plugin-template";
import path from "node:path";
import { fileURLToPath } from "node:url";

// File path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

//
// ✅ Base TypeScript and general rules
//
const baseConfig = tseslint.config({
  extends: [eslint.configs.recommended, tseslint.configs.strict, tseslint.configs.stylistic],
  rules: {
    "no-console": "warn",
    "no-unused-vars": "off",
  },
});

//
// ✅ Angular-specific rules
//
const angularConfig = tseslint.config({
  files: ["**/*.ts"],
  extends: [
    "plugin:@angular-eslint/recommended",
    "plugin:@angular-eslint/template/process-inline-templates",
  ],
  plugins: {
    "@angular-eslint": angular,
  },
  rules: {
    "@angular-eslint/component-class-suffix": "error",
    "@angular-eslint/directive-class-suffix": "error",
    "@angular-eslint/no-host-metadata-property": "off",
    "@angular-eslint/no-input-rename": "warn",
    "@angular-eslint/no-output-rename": "warn",
    "@angular-eslint/use-lifecycle-interface": "off",
    "@angular-eslint/prefer-on-push-component-change-detection": "warn",
  },
});

//
// ✅ Angular template linting (HTML files inside Angular components)
//
const angularTemplateConfig = tseslint.config({
  files: ["**/*.html"],
  extends: ["plugin:@angular-eslint/template/recommended"],
  plugins: {
    "@angular-eslint/template": angularTemplate,
  },
  rules: {
    "@angular-eslint/template/banana-in-box": "error",
    "@angular-eslint/template/no-negated-async": "warn",
  },
});

//
// ✅ Combine everything with Astro + Prettier
//
export default tseslint.config(
  includeIgnoreFile(gitignorePath),
  baseConfig,
  angularConfig,
  angularTemplateConfig,
  eslintPluginAstro.configs["flat/recommended"],
  eslintPluginPrettier
);
