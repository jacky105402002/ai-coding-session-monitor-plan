import nextPlugin from "@next/eslint-plugin-next";

export default [
  nextPlugin.flatConfig.coreWebVitals,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"]
  }
];
