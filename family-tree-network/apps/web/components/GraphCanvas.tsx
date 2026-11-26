'use client';

import cytoscape, { type Core, type ElementDefinition, type StylesheetStyle } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GraphEdge, GraphNode } from '../lib/api';
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
  bg: '#071426',
  card: '#13243D',
  gold: '#E8B94F',
  goldHi: '#FFD978',
  text: '#F5F7FC',
  muted: '#AAB7CA',
};

/** Elegant initials avatar (SVG data URI) — no photos needed, nothing leaked. */
export function avatarFor(name: string, accent = C.gold): string {
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
<defs><radialGradient id='g' cx='35%' cy='28%' r='80%'><stop offset='0' stop-color='#24466F'/><stop offset='0.55' stop-color='#13243D'/><stop offset='1' stop-color='#0A1729'/></radialGradient></defs>
<circle cx='60' cy='60' r='60' fill='url(#g)'/>
<circle cx='60' cy='60' r='56' fill='none' stroke='${accent}' stroke-opacity='0.35' stroke-width='2'/>
<text x='60' y='61' dominant-baseline='middle' text-anchor='middle' font-family='Georgia, "Times New Roman", serif' font-size='50' fill='${accent}'>${initial
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
        avatar: avatarFor(n.displayName, n.id === focusId ? C.goldHi : C.gold),
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

// `underlay-*` (glow) is supported by Cytoscape ≥ 3.18 but missing from @types/cytoscape.
const STYLE = [
  {
    selector: 'node',
    style: {
      width: 50,
      height: 50,
      shape: 'ellipse',
      'background-color': C.card,
      'background-image': 'data(avatar)',
      'background-fit': 'cover',
      'border-width': 2,
      'border-color': '#2C4A73',
      label: 'data(label)',
      color: C.text,
      'font-size': 11,
      'font-family': 'Inter, "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'text-valign': 'bottom',
      'text-margin-y': 7,
      'text-outline-color': C.bg,
      'text-outline-width': 3,
      'min-zoomed-font-size': 7,
      'transition-property': 'opacity, border-color, width, height',
      'transition-duration': 250,
    },
  },
  { selector: 'node.claimed', style: { 'border-color': '#3D6597' } },
  { selector: 'node.managed', style: { 'border-style': 'dashed', 'border-color': '#5B7AA3' } },
  { selector: 'node.deceased', style: { 'background-opacity': 0.75, 'border-color': '#7D8CA3' } },
  {
    selector: 'node.expandable',
    style: { 'border-width': 3, 'border-style': 'double', 'border-color': '#4C79B3' },
  },
  {
    selector: 'node.focus',
    style: {
      width: 78,
      height: 78,
      'border-width': 3,
      'border-style': 'solid',
      'border-color': C.goldHi,
      'font-size': 13,
      'font-weight': 'bold',
      color: C.goldHi,
      'underlay-color': C.gold,
      'underlay-opacity': 0.22,
      'underlay-padding': 14,
      'underlay-shape': 'ellipse',
    },
  },
  { selector: 'node.viewer', style: { 'border-color': C.gold } },
  {
    selector: 'node:selected',
    style: { 'border-color': C.goldHi, 'border-width': 4, 'underlay-color': C.goldHi, 'underlay-opacity': 0.3, 'underlay-padding': 10, 'underlay-shape': 'ellipse' },
  },
  {
    selector: 'edge',
    style: {
      width: 2.4,
      'curve-style': 'bezier',
      'line-color': 'data(color)',
      opacity: 0.92,
      'underlay-color': 'data(color)',
      'underlay-opacity': 0.16,
      'underlay-padding': 4,
      'target-arrow-shape': 'none',
      'font-size': 9,
      color: C.muted,
      'text-background-color': C.bg,
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
      'min-zoomed-font-size': 8,
      'transition-property': 'opacity, width, underlay-opacity',
      'transition-duration': 250,
    },
  },
  { selector: 'edge.union', style: { width: 3.4, 'underlay-opacity': 0.24 } },
  { selector: 'edge.directed', style: { 'target-arrow-shape': 'triangle', 'target-arrow-color': 'data(color)', 'arrow-scale': 0.8 } },
  { selector: 'edge.pending', style: { 'line-style': 'dashed', 'line-dash-pattern': [7, 5], opacity: 0.6, 'underlay-opacity': 0 } },
  { selector: 'edge.disputed', style: { 'line-style': 'dotted', opacity: 0.55, 'underlay-opacity': 0 } },
  { selector: '.faded', style: { opacity: 0.13 } },
  { selector: 'edge.hl', style: { width: 4, opacity: 1, 'underlay-opacity': 0.42, 'underlay-padding': 7, 'z-index': 10 } },
  { selector: 'node.hl', style: { 'border-color': C.goldHi } },
  {
    selector: 'edge.path',
    style: { width: 5, opacity: 1, 'line-color': C.goldHi, 'target-arrow-color': C.goldHi, 'underlay-color': C.goldHi, 'underlay-opacity': 0.5, 'underlay-padding': 8, 'z-index': 20 },
  },
  { selector: 'node.path', style: { 'border-color': C.goldHi, 'border-width': 4, 'underlay-color': C.goldHi, 'underlay-opacity': 0.35, 'underlay-padding': 10, 'underlay-shape': 'ellipse' } },
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
      const els = cy.elements('.path');
      if (els.nonempty()) cy.animate({ fit: { eles: els, padding: 80 }, duration: 500 });
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
