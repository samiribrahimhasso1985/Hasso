'use client';

import cytoscape, { type Core, type ElementDefinition, type StylesheetStyle } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { photoSrc, type GraphEdge, type GraphNode } from '../lib/api';
import { generationLayout } from '../lib/layout';

let registered = false;
function ensureExtensions() {
  if (!registered) {
    cytoscape.use(fcose);
    registered = true;
  }
}

export type LayoutMode = 'network' | 'generations';

export interface GraphCanvasHandle {
  fit: () => void;
  focusGeneration: (gen: number) => void;
  centerOn: (id: string) => void;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  focusId: string;
  layout: LayoutMode;
  showLabels: boolean;
  rtl: boolean;
  youLabel: string;
  selectedId: string | null;
  highlight: { nodeIds: string[]; edgeIds: string[] } | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string) => void;
  onExpand: (id: string) => void;
}

const C = {
  bg: '#FAF9F5', // Soft Cream canvas
  card: '#FAF9F5',
  ring: '#DDD8CE', // Warm Gray
  ringStrong: '#858078', // Stone Gray
  focus: '#30302D', // Deep Graphite
  accent: '#826658', // Muted Terracotta (ink)
  text: '#30302D',
  muted: '#716C65',
};

/** Calm initials avatar (SVG data URI) — no photos needed, nothing leaked. */
export function avatarFor(name: string, emphasis = false): string {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?';
  const fill = emphasis ? '#30302D' : '#E9E5DC';
  const ink = emphasis ? '#FAF9F5' : '#30302D';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
<circle cx='60' cy='60' r='60' fill='${fill}'/>
<text x='60' y='62' dominant-baseline='middle' text-anchor='middle' font-family='Inter, "IBM Plex Sans Arabic", system-ui, sans-serif' font-weight='500' font-size='46' fill='${ink}'>${initial
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function toElements(nodes: GraphNode[], edges: GraphEdge[], focusId: string, youLabel: string): ElementDefinition[] {
  const els: ElementDefinition[] = [];
  for (const n of nodes) {
    const sub = n.isViewer && n.id !== focusId ? youLabel : n.kinship?.label;
    const classes = [
      n.id === focusId ? 'focus' : '',
      n.isViewer ? 'viewer' : '',
      n.claimed ? 'claimed' : 'managed',
      n.deceased ? 'deceased' : '',
      n.hiddenNeighbours > 0 ? 'expandable' : '',
    ].join(' ');
    els.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: sub ? `${n.displayName}\n${sub}` : n.displayName,
        avatar: photoSrc(n.avatarUrl) ?? avatarFor(n.displayName, n.id === focusId),
        hasPhoto: n.avatarUrl ? 1 : 0,
        generation: n.generation,
      },
      classes,
    });
  }
  for (const e of edges) {
    els.push({
      group: 'edges',
      data: { id: e.id, source: e.source, target: e.target, color: e.color, label: e.label, category: e.category },
      classes: [e.status.toLowerCase(), e.directed ? 'directed' : '', e.category.toLowerCase()].join(' '),
    });
  }
  return els;
}

// Editorial minimalism: thin lines, no glow, contrast-safe line colours (≥ 3:1 on the canvas).
const STYLE = [
  {
    selector: 'node',
    style: {
      width: 48,
      height: 48,
      shape: 'ellipse',
      'background-color': '#E9E5DC',
      'background-image': 'data(avatar)',
      'background-fit': 'cover',
      'border-width': 1.5,
      'border-color': C.ring,
      label: 'data(label)',
      color: C.text,
      'font-size': 11,
      'font-family': 'Inter, "IBM Plex Sans Arabic", "Noto Sans Arabic", system-ui, sans-serif',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-valign': 'bottom',
      'text-margin-y': 7,
      'text-outline-color': C.bg,
      'text-outline-width': 3,
      'min-zoomed-font-size': 7,
      'transition-property': 'opacity, border-color, border-width',
      'transition-duration': 250,
    },
  },
  { selector: 'node.claimed', style: { 'border-color': C.ringStrong } },
  { selector: 'node.managed', style: { 'border-style': 'dashed', 'border-color': C.ringStrong } },
  { selector: 'node.deceased', style: { 'background-opacity': 0.7 } },
  { selector: 'node.expandable', style: { 'border-width': 3, 'border-style': 'double', 'border-color': C.ringStrong } },
  {
    selector: 'node.focus',
    style: {
      width: 74,
      height: 74,
      'border-width': 2,
      'border-style': 'solid',
      'border-color': C.focus,
      'font-size': 13,
      'font-weight': 600,
    },
  },
  { selector: 'node.viewer', style: { 'border-color': C.focus } },
  { selector: 'node:selected', style: { 'border-color': C.accent, 'border-width': 3 } },
  {
    selector: 'edge',
    style: {
      width: 1.8,
      'curve-style': 'bezier',
      'line-color': 'data(color)',
      opacity: 1,
      'target-arrow-shape': 'none',
      'font-size': 9,
      color: C.muted,
      'text-background-color': C.bg,
      'text-background-opacity': 0.92,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'min-zoomed-font-size': 8,
      'transition-property': 'opacity, width',
      'transition-duration': 250,
    },
  },
  { selector: 'edge.union', style: { width: 2.8 } },
  { selector: 'edge.directed', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': 'data(color)', 'arrow-scale': 0.75 } },
  { selector: 'edge.pending', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] } },
  { selector: 'edge.disputed', style: { 'line-style': 'dotted' } },
  { selector: '.faded', style: { opacity: 0.18 } },
  { selector: 'edge.hl', style: { width: 3, 'z-index': 10 } },
  { selector: 'node.hl', style: { 'border-color': C.focus } },
  { selector: 'edge.path', style: { width: 4, 'line-color': C.focus, 'target-arrow-color': C.focus, 'z-index': 20 } },
  { selector: 'node.path', style: { 'border-color': C.focus, 'border-width': 3 } },
] as unknown as StylesheetStyle[];

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(props, ref) {
  const box = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const cb = useRef(props);
  cb.current = props;
  const layoutKey = useRef('');

  useEffect(() => {
    ensureExtensions();
    const cy = cytoscape({
      container: box.current!,
      style: STYLE,
      minZoom: 0.15,
      maxZoom: 3,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
    });
    cy.on('tap', 'node', (e) => cb.current.onSelectNode(e.target.id()));
    cy.on('tap', 'edge', (e) => cb.current.onSelectEdge(e.target.id()));
    cy.on('tap', (e) => {
      if (e.target === cy) cb.current.onSelectNode(null);
    });
    cy.on('dbltap', 'node', (e) => cb.current.onExpand(e.target.id()));
    cyRef.current = cy;
    return () => cy.destroy();
  }, []);

  // Sync elements (add / update / remove) without recreating the graph.
  useEffect(() => {
    const cy = cyRef.current!;
    const els = toElements(props.nodes, props.edges, props.focusId, props.youLabel);
    const ids = new Set(els.map((e) => e.data.id!));
    cy.batch(() => {
      cy.elements().forEach((el) => {
        if (!ids.has(el.id())) el.remove();
      });
      for (const el of els) {
        const existing = cy.getElementById(el.data.id!);
        if (existing.nonempty()) {
          existing.data(el.data);
          existing.classes(el.classes as string);
        } else {
          cy.add(el);
        }
      }
    });

    const key = `${props.layout}|${props.rtl}|${[...ids].sort().join(',')}`;
    if (key !== layoutKey.current) {
      layoutKey.current = key;
      runLayout(cy, props.layout, props.focusId, props.rtl);
    }
  }, [props.nodes, props.edges, props.focusId, props.layout, props.rtl, props.youLabel]);

  // Edge labels on/off
  useEffect(() => {
    cyRef.current!.style().selector('edge').style('label', props.showLabels ? 'data(label)' : '').update();
  }, [props.showLabels]);

  // Selection + neighbourhood highlight
  useEffect(() => {
    const cy = cyRef.current!;
    cy.batch(() => {
      cy.elements().removeClass('faded hl');
      cy.elements().unselect();
      if (props.selectedId && !props.highlight) {
        const n = cy.getElementById(props.selectedId);
        if (n.nonempty()) {
          n.select();
          const hood = n.closedNeighborhood();
          cy.elements().not(hood).addClass('faded');
          hood.edges().addClass('hl');
          hood.nodes().addClass('hl');
        }
      }
    });
  }, [props.selectedId, props.highlight, props.nodes, props.edges]);

  // Path highlight ("How are we connected?")
  useEffect(() => {
    const cy = cyRef.current!;
    cy.batch(() => {
      cy.elements().removeClass('path');
      if (props.highlight) {
        const set = new Set([...props.highlight.nodeIds, ...props.highlight.edgeIds]);
        cy.elements().forEach((el) => {
          if (set.has(el.id())) el.addClass('path');
          else el.addClass('faded');
        });
      }
    });
    if (props.highlight) {
      // wait for a running layout animation to settle, then frame the whole path
      const t = setTimeout(() => {
        const els = cy.elements('.path');
        if (els.nonempty()) cy.animate({ fit: { eles: els, padding: 80 }, duration: 500 });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [props.highlight, props.nodes, props.edges]);

  useImperativeHandle(ref, () => ({
    fit: () => cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 50 }, duration: 400 }),
    focusGeneration: (gen: number) => {
      const cy = cyRef.current!;
      const row = cy.nodes().filter((n) => n.data('generation') === gen);
      if (row.nonempty()) cy.animate({ fit: { eles: row.closedNeighborhood(), padding: 90 }, duration: 450 });
    },
    centerOn: (id: string) => {
      const cy = cyRef.current!;
      const n = cy.getElementById(id);
      if (n.nonempty()) cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), 1), duration: 400 });
    },
  }));

  return <div ref={box} className="graph-canvas" data-testid="graph-canvas" role="img" aria-label="Relationship graph" />;
});

function runLayout(cy: Core, mode: LayoutMode, focusId: string, rtl: boolean) {
  if (cy.nodes().empty()) return;
  if (mode === 'generations') {
    const positions = generationLayout(
      cy.nodes().map((n) => ({ id: n.id(), generation: n.data('generation') as number | null })),
      cy.edges().map((e) => ({ source: e.data('source'), target: e.data('target'), category: e.data('category') })),
      focusId,
      rtl,
    );
    cy.layout({ name: 'preset', positions: (n: { id: () => string }) => positions.get(n.id()) ?? { x: 0, y: 0 }, animate: true, animationDuration: 550, fit: true, padding: 60 } as cytoscape.LayoutOptions).run();
    return;
  }
  cy.layout({
    name: 'fcose',
    quality: 'proof',
    animate: true,
    animationDuration: 650,
    randomize: true,
    fit: true,
    padding: 60,
    nodeSeparation: 110,
    idealEdgeLength: (e: { data: (k: string) => string }) => (e.data('category') === 'FAMILY' || e.data('category') === 'UNION' ? 110 : 160),
    nodeRepulsion: () => 9000,
    gravity: 0.3,
    fixedNodeConstraint: cy.getElementById(focusId).nonempty() ? [{ nodeId: focusId, position: { x: 0, y: 0 } }] : undefined,
  } as unknown as cytoscape.LayoutOptions).run();
}

export default GraphCanvas;
