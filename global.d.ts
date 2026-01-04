
/**
 * Extending the NodeJS namespace to include the API_KEY environment variable.
 * Since 'process' is likely already defined in the global scope (e.g., by Vite or node types),
 * we use interface merging on NodeJS.ProcessEnv to add our custom environment variable.
 * This avoids redeclaration conflicts.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
