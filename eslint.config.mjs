import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/components/datatable/index.tsx"],
    rules: {
      // TanStack Table v8 uses interior mutability; React Compiler skips memoization by design.
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "eslint-report.txt", "scripts/**"],
  },
];

export default eslintConfig;
