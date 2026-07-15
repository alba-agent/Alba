import { useState, useEffect, memo } from "react";

interface MemoryNode {
  id: string;
  label: string;
  tags?: string[];
  ts?: number;
}

interface MemoryEdge {
  source: string;
  target: string;
}

export default memo(function MemoryGraph() {
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [edges, setEdges] = useState<MemoryEdge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch memory graph from server
    fetch("/api/memory/graph")
      .then(r => r.json())
      .then(data => {
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
      })
      .catch(() => {
        // Fallback: generate sample data
        setNodes([
          { id: "1", label: "BTC Analysis" },
          { id: "2", label: "ETH Analysis" },
          { id: "3", label: "Portfolio Review" },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Memory Graph</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-alba-accent/10 text-alba-accent">
            {nodes.length} nodes
          </span>
        </div>

        <div className="glass rounded-xl p-4 h-96">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-alba-muted">Loading graph...</span>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <p className="text-alba-muted">Memory visualization</p>
                <p className="text-sm">Nodes: {nodes.length} | Edges: {edges.length}</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {nodes.map((n) => (
                    <span key={n.id} className="px-3 py-1 rounded-full bg-alba-accent/10 text-alba-accent">
                      {n.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});