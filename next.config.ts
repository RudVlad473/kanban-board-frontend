import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    /*
     * Disabled: Next.js 16's auto-generated agent-rule files collide with this
     * repository's own project-governance CLAUDE.md (managed outside this scaffold).
     */
    agentRules: false,
    experimental: { staleTimes: { dynamic: 300 } },
};

export default nextConfig;
