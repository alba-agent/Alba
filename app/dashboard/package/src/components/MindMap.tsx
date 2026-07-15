import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "file" | "summary" | "prompt";
  community?: number;
  connections?: GraphNode[];
  summary?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ source: string; target: string; type: string }>;
}

// ── Simple force-directed layout (no external deps) ───────────────────────────
function useForceLayout(nodes: GraphNode[], edges: Array<{ source: string; target: string }>, width = 800, height = 600) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (nodes.length === 0) {
      setPositions({});
      return;
    }

    // Initialize positions in a circle for better distribution
    const initPos: Record<string, { x: number; y: number }> = {};
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      initPos[n.id] = { 
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });

    // Run simple force simulation
    const pos = { ...initPos };
    const repulsion = 0.005;
    const attraction = 0.02;
    const damping = 0.85;
    const iterations = 200;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      nodes.forEach(a => {
        nodes.forEach(b => {
          if (a.id === b.id) return;
          const dx = pos[a.id].x - pos[b.id].x;
          const dy = pos[a.id].y - pos[b.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = repulsion * (repulsion / dist);
          pos[a.id].x += (dx / dist) * force;
          pos[a.id].y += (dy / dist) * force;
        });
      });

      // Attraction along edges (spring force)
      edges.forEach(e => {
        const a = pos[e.source];
        const b = pos[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const force = attraction * (dist - 150);
        a.x += (dx / dist) * force;
        a.y += (dy / dist) * force;
        b.x -= (dx / dist) * force;
        b.y -= (dy / dist) * force;
      });

      // Center attraction (nodes pulled toward center)
      nodes.forEach(n => {
        const dx = centerX - pos[n.id].x;
        const dy = centerY - pos[n.id].y;
        pos[n.id].x += dx * 0.001;
        pos[n.id].y += dy * 0.001;
      });

      // Apply damping and bounds
      nodes.forEach(n => {
        pos[n.id].x = Math.max(50, Math.min(width - 50, pos[n.id].x));
        pos[n.id].y = Math.max(50, Math.min(height - 50, pos[n.id].y));
      });
    }

    setPositions(pos);
  }, [nodes, edges, width, height]);

  return positions;
}

export default function MindMap() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const positions = useForceLayout(graph.nodes, graph.edges);

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch("/api/memory/graph");
      if (res.ok) {
        const data = await res.json();
        setGraph(data);
      }
    } catch (e) {
      console.error("Failed to fetch graph:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 30000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      concept: "#69ff94",
      file: "#8b5cf6",
      summary: "#f59e0b",
      prompt: "#06b6d4",
    };
    return colors[type] || "#ffffff";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-alba-muted">Loading mind map...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-alba-surface/50">
      <div className="h-10 border-b border-alba-border px-3 flex items-center bg-alba-bg/50">
        <div className="text-xs font-mono text-alba-muted/60">Mind Map</div>
        <div className="flex-1" />
        <span className="text-[10px] text-alba-muted">{graph.nodes.length} nodes</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 600">
          {/* Render edges with proper positions */}
          {graph.edges.map((edge, i) => {
            const sourcePos = positions[edge.source];
            const targetPos = positions[edge.target];
            if (!sourcePos || !targetPos) return null;
            return (
              <line
                key={i}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#333"
                strokeWidth="1"
                opacity="0.3"
              />
            );
          })}
          {/* Render nodes with proper positions */}
          {graph.nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            return (
              <g key={node.id} transform={`translate(${pos.x},${pos.y})`}>
                <motion.circle
                  r="20"
                  fill={getNodeColor(node.type)}
                  fillOpacity="0.2"
                  stroke={getNodeColor(node.type)}
                  strokeWidth="2"
                  whileHover={{ scale: 1.2 }}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: "pointer" }}
                />
                <text
                  y="5"
                  fontSize="10"
                  fill="#fff"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {node.label.slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <AnimatePresence>
        {(hoveredNode || selectedNode) && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 bg-alba-bg/95 backdrop-blur-sm border-t border-alba-border p-3"
          >
            <div className="text-xs">
              <strong>{selectedNode?.label || hoveredNode?.label}</strong>
              <div className="text-alba-muted mt-1">
                {selectedNode?.summary || hoveredNode?.summary || "No summary available"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}