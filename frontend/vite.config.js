import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ["react", "react-dom"],
                    query: ["@tanstack/react-query"],
                    pdf: ["jspdf"],
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
    },
});
