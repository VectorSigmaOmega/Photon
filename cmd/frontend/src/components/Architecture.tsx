const NODES = [
  { x: 30, label: "Browser" },
  { x: 180, label: "API" },
  { x: 330, label: "Redis" },
  { x: 480, label: "Worker" },
  { x: 630, label: "MinIO" },
] as const;

export function Architecture() {
  return (
    <div className="rounded-lg border border-ink/10 bg-paper-deep/30 p-6">
      <svg
        viewBox="0 0 760 110"
        className="block w-full"
        role="img"
        aria-label="Photon topology: browser, API, Redis, worker, MinIO, Postgres."
      >
        <defs>
          <marker
            id="t-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="oklch(32% 0.02 60)" />
          </marker>
        </defs>

        {NODES.map((node, i) => (
          <g key={node.label}>
            <circle cx={node.x} cy={55} r={6} fill="oklch(96% 0.012 75)" stroke="oklch(18% 0.02 60)" />
            <text
              x={node.x}
              y={82}
              textAnchor="middle"
              className="fill-ink font-sans"
              fontSize="11"
            >
              {node.label}
            </text>
            {i < NODES.length - 1 && (
              <line
                x1={node.x + 8}
                y1={55}
                x2={NODES[i + 1].x - 8}
                y2={55}
                stroke="oklch(32% 0.02 60 / 0.6)"
                strokeWidth="1"
                markerEnd="url(#t-arrow)"
              />
            )}
          </g>
        ))}

        <g>
          <circle cx={330} cy={20} r={5} fill="oklch(96% 0.012 75)" stroke="oklch(18% 0.02 60)" />
          <text x={345} y={24} className="fill-ink-soft font-sans" fontSize="10">
            Postgres
          </text>
          <line
            x1={180}
            y1={49}
            x2={325}
            y2={22}
            stroke="oklch(32% 0.02 60 / 0.4)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <line
            x1={480}
            y1={49}
            x2={335}
            y2={22}
            stroke="oklch(32% 0.02 60 / 0.4)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        </g>
      </svg>
      <div className="mt-2 text-xs text-ink-mute">
        Solid edges carry image bytes and queue messages. Dashed edges record
        job state in Postgres.
      </div>
    </div>
  );
}
