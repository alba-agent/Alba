import { createContext, useContext, useEffect, useState, useCallback } from "react";
import React from "react";

interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "file" | "summary" | "prompt";
  community?: number;
  summary?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: Array<{ source: string; target: string; type: string }>;
}

interface GraphContextValue {
  graph: GraphData;
  loading: boolean;
  refresh: () => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/memory/graph");
      if (res.ok) {
        setGraph(await res.json());
      }
    } catch (e) {
      console.error("Graph fetch error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGraph();
    const interval = setInterval(fetchGraph, 30000);
    return () => clearInterval(interval);
  }, [fetchGraph]);

  return (
    <GraphContext.Provider value={{ graph, loading, refresh: fetchGraph }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error("useGraph must be used within GraphProvider");
  return ctx;
}