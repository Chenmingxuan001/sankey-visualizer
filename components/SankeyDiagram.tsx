import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLeft, sankeyJustify, sankeyRight, sankeyCenter } from 'd3-sankey';
import { GraphData, VisualizationSettings, SankeyNode, SankeyLink, CustomLabel, SavedLayoutMap, SavedNodeLayout, SavedLinkLayout } from '../types';

interface Props {
  data: GraphData;
  settings: VisualizationSettings;
  customLabels: CustomLabel[];
  onUpdateLabels: (labels: CustomLabel[]) => void;
  savedLayout: SavedLayoutMap | null;
  onSaveLayout: (layout: SavedLayoutMap) => void;
  width?: number;
  height?: number;
}

export interface SankeyDiagramRef {
    saveLayout: () => void;
}

// Helper to generate a unique key for a link to save its state
const getLinkKey = (link: SankeyLink) => {
    const sId = (link.source as SankeyNode).id;
    const tId = (link.target as SankeyNode).id;
    return `${sId}-${tId}`;
};

const SankeyDiagram = forwardRef<SankeyDiagramRef, Props>(({ 
    data, 
    settings, 
    customLabels, 
    onUpdateLabels,
    savedLayout,
    onSaveLayout,
    width = 1100, 
    height = 700 
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Internal graph state
  const [graph, setGraph] = useState<any>(null);
  
  // Store manual adjustments for links
  const [linkOffsets, setLinkOffsets] = useState<Record<string, SavedLinkLayout>>({});

  // Initialize Link Offsets from Saved Layout
  useEffect(() => {
      if (savedLayout?.links) {
          setLinkOffsets(savedLayout.links);
      }
  }, [savedLayout]);

  // Helper to calculate center
  const getCenter = (node: SankeyNode) => ({
      x: (node.x0! + node.x1!) / 2,
      y: (node.y0! + node.y1!) / 2
  });

  // --- 1. Initial Data Load (D3 Layout) ---
  useEffect(() => {
    if (!data.nodes.length) return;

    // Deep copy
    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.links.map(l => ({ ...l }));

    const { nodeWidth, nodePadding, align, flowScale } = settings;
    const alignMethod = align === 'left' ? sankeyLeft : align === 'right' ? sankeyRight : align === 'center' ? sankeyCenter : sankeyJustify;

    // Calculate vertical margins based on flowScale
    const effectiveHeight = (height - 10) * (flowScale || 0.9);
    const verticalMargin = (height - effectiveHeight) / 2;

    const sankeyGenerator = d3Sankey<SankeyNode, SankeyLink>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .nodeAlign(alignMethod)
      .extent([[1, verticalMargin], [width - 1, height - verticalMargin]]);

    try {
        const generated = sankeyGenerator({ nodes, links });
        
        // APPLY SAVED NODE LAYOUT
        if (savedLayout?.nodes) {
             generated.nodes.forEach((node: SankeyNode) => {
                 const saved = savedLayout.nodes[node.id]; // Key by ID
                 if (saved) {
                     node.x0 = saved.x0;
                     node.x1 = saved.x1;
                     node.y0 = saved.y0;
                     node.y1 = saved.y1;
                     node.isRotated = saved.isRotated;
                 }
             });
        } else {
            // APPLY CUSTOM DEFAULT LAYOUT (Figure S8 Style)
            // Only if no saved layout exists
            const topBarY = 20;
            const topBarHeight = 20;
            const bottomBarY = height - 40;
            const bottomBarHeight = 20;
            
            generated.nodes.forEach((node: SankeyNode) => {
                const w = node.x1! - node.x0!;
                const h = node.y1! - node.y0!;
                
                if (node.id === 'export') {
                     // Top Right Trade Bar (Export)
                    node.x0 = width / 2;
                    node.x1 = width - 100;
                    node.y0 = topBarY;
                    node.y1 = topBarY + topBarHeight;
                    node.isRotated = true;
                } else if (node.id === 'loss') {
                    // Bottom Loss Bar
                    node.x0 = 100;
                    node.x1 = width - 100;
                    node.y0 = bottomBarY;
                    node.y1 = bottomBarY + bottomBarHeight;
                    node.isRotated = true;
                } else if (node.id === 'eol') {
                    // End of Life Node: Positioned to the right of products
                    node.x0 = 1050;
                    node.x1 = 1050 + w;
                    const centerY = height / 2;
                    node.y0 = centerY;
                    node.y1 = centerY + h;
                } else {
                    // Domestic Flow: Left to Right
                    const centerY = height / 2;
                    const halfH = h / 2;
                    
                    if (node.id === 'ore') {
                        node.x0 = 50;
                        node.x1 = 50 + w;
                        node.y0 = centerY - halfH;
                        node.y1 = centerY + halfH;
                    } else if (node.id === 'concentrate') {
                        node.x0 = 250;
                        node.x1 = 250 + w;
                        node.y0 = centerY - halfH;
                        node.y1 = centerY + halfH;
                    } else if (node.id === 'metal') {
                        node.x0 = 450;
                        node.x1 = 450 + w;
                        node.y0 = centerY - halfH;
                        node.y1 = centerY + halfH;
                    } else if (node.id === 'magnet') {
                        node.x0 = 650;
                        node.x1 = 650 + w;
                        // Slight offset up
                        node.y0 = centerY - halfH - 50;
                        node.y1 = centerY + halfH - 50;
                    } else if (node.id === 'other_semi') {
                        node.x0 = 650;
                        node.x1 = 650 + w;
                        // Slight offset down
                        node.y0 = centerY - halfH + 80;
                        node.y1 = centerY + halfH + 80;
                    } else if (node.id === 'wind_turbine') {
                        node.x0 = 900;
                        node.x1 = 900 + w;
                        node.y0 = centerY - halfH - 50;
                        node.y1 = centerY + halfH - 50;
                    } else if (node.id === 'other_final') {
                        node.x0 = 900;
                        node.x1 = 900 + w;
                        node.y0 = centerY - halfH + 50;
                        node.y1 = centerY + halfH + 50;
                    }
                }
            });
        }

        setGraph(generated);
    } catch (e) {
        console.error("Layout Error", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, settings.flowScale]); 

  // --- 2. Live Update Layout (Settings Change) ---
  useEffect(() => {
    if (!graph) return;
    setGraph((prev: any) => {
        const newNodes = prev.nodes.map((n: SankeyNode) => {
             const currentW = n.x1! - n.x0!;
             const diff = settings.nodeWidth - currentW;
             return { ...n, x1: n.x1! + diff };
        });
        return { ...prev, nodes: newNodes };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.nodeWidth]); 


  // --- 3. Routing Logic with Manual Overrides ---
  const routedGraph = useMemo(() => {
      if (!graph) return null;
      
      const nodes = graph.nodes as SankeyNode[];
      const links = graph.links as SankeyLink[];

      const nodeBuckets = new Map<number, {
          top: SankeyLink[], bottom: SankeyLink[], left: SankeyLink[], right: SankeyLink[],
          inTop: SankeyLink[], inBottom: SankeyLink[], inLeft: SankeyLink[], inRight: SankeyLink[]
      }>();

      nodes.forEach((n, i) => {
          nodeBuckets.set(i, { 
              top: [], bottom: [], left: [], right: [],
              inTop: [], inBottom: [], inLeft: [], inRight: []
           });
      });

      // 1. Determine Sides
      links.forEach(l => {
          const source = l.source as SankeyNode;
          const target = l.target as SankeyNode;
          const linkKey = getLinkKey(l);
          const saved = linkOffsets[linkKey];

          const sW = source.x1! - source.x0!;
          const sH = source.y1! - source.y0!;
          const sourceIsHorizontal = sW > sH; 

          const tW = target.x1! - target.x0!;
          const tH = target.y1! - target.y0!;
          const targetIsHorizontal = tW > tH;

          const sC = getCenter(source);
          const tC = getCenter(target);

          // Determine Source Side
          let sourceSide: 'right'|'left'|'bottom'|'top';
          if (saved?.sourceSide) {
              sourceSide = saved.sourceSide;
          } else {
              // Heuristic
              if (sourceIsHorizontal) {
                  sourceSide = (tC.y > sC.y) ? 'bottom' : 'top';
              } else {
                  sourceSide = (tC.x > sC.x) ? 'right' : 'left';
              }
          }

          // Determine Target Side
          let targetSide: 'left'|'right'|'top'|'bottom';
          if (saved?.targetSide) {
              targetSide = saved.targetSide;
          } else {
               // Heuristic
               if (targetIsHorizontal) {
                   targetSide = (sC.y > tC.y) ? 'bottom' : 'top';
               } else {
                   targetSide = (sC.x > tC.x) ? 'right' : 'left';
               }
          }

          nodeBuckets.get(source.index!)![sourceSide].push(l);
          const inKey = ('in' + targetSide.charAt(0).toUpperCase() + targetSide.slice(1)) as keyof typeof nodeBuckets.get;
          // @ts-ignore
          nodeBuckets.get(target.index!)![inKey].push(l);
          
          l.sourceCoords = { ...l.sourceCoords!, side: sourceSide };
          l.targetCoords = { ...l.targetCoords!, side: targetSide };
      });

      // 2. Compute Coordinates
      const getCoords = (node: SankeyNode, links: SankeyLink[], side: string) => {
          if (links.length === 0) return;

          // Default Sort
          links.sort((a, b) => {
              const otherA = (side.startsWith('in') ? a.source : a.target) as SankeyNode;
              const otherB = (side.startsWith('in') ? b.source : b.target) as SankeyNode;
              const cA = getCenter(otherA);
              const cB = getCenter(otherB);
              
              if (side.toLowerCase().includes('top') || side.toLowerCase().includes('bottom')) {
                   return cA.x - cB.x;
              } else {
                   return cA.y - cB.y;
              }
          });

          const totalValue = links.reduce((sum, l) => sum + (l.width || 1), 0);
          
          const nodeW = node.x1! - node.x0!;
          const nodeH = node.y1! - node.y0!;
          const isHorizontalEdge = (side.toLowerCase().includes('top') || side.toLowerCase().includes('bottom'));
          const edgeLength = isHorizontalEdge ? nodeW : nodeH;

          // Default: Center the bundle
          let currentPos = (edgeLength - totalValue) / 2;
          currentPos = Math.max(0, currentPos);

          links.forEach(l => {
             const lw = l.width || 1;
             const linkKey = getLinkKey(l);
             const savedOffset = linkOffsets[linkKey];
             
             // Check if we have a manual offset for this specific end
             let manualPos: number | undefined;
             if (side.startsWith('in')) {
                 manualPos = savedOffset?.targetOffset;
             } else {
                 manualPos = savedOffset?.sourceOffset;
             }

             // Calculate position along edge (0 to edgeLength)
             // If manualPos is defined, use it as the center of the link width
             let posOnEdge = (manualPos !== undefined) ? (manualPos - lw/2) : currentPos;
             
             // Clamp to be inside node roughly
             posOnEdge = Math.max(0, Math.min(posOnEdge, edgeLength - lw));

             const mid = posOnEdge + lw / 2;
             
             let x=0, y=0;
             if (side.toLowerCase().includes('right')) {
                 x = node.x1!;
                 y = node.y0! + mid;
             } else if (side.toLowerCase().includes('left')) {
                 x = node.x0!;
                 y = node.y0! + mid;
             } else if (side.toLowerCase().includes('bottom')) {
                 x = node.x0! + mid;
                 y = node.y1!;
             } else if (side.toLowerCase().includes('top')) {
                 x = node.x0! + mid;
                 y = node.y0!;
             }

             if (side.startsWith('in')) {
                 l.targetCoords = { x, y, side: side.replace('in','').toLowerCase() as any };
             } else {
                 l.sourceCoords = { x, y, side: side as any };
             }
             
             // Increment default position only
             currentPos += lw;
          });
      };

      nodes.forEach((n, i) => {
          const b = nodeBuckets.get(i)!;
          getCoords(n, b.top, 'top');
          getCoords(n, b.bottom, 'bottom');
          getCoords(n, b.left, 'left');
          getCoords(n, b.right, 'right');
          getCoords(n, b.inTop, 'inTop');
          getCoords(n, b.inBottom, 'inBottom');
          getCoords(n, b.inLeft, 'inLeft');
          getCoords(n, b.inRight, 'inRight');
      });

      return { nodes, links };
  }, [graph, linkOffsets]);


  // --- 4. Handler: Save Layout ---
  const handleSaveClick = () => {
      if (!graph) return;
      const nodesMap: Record<string, SavedNodeLayout> = {};
      graph.nodes.forEach((n: SankeyNode) => {
          // Use ID instead of Name for saving to handle duplicates like 'Export'
          nodesMap[n.id] = {
              x0: n.x0!,
              x1: n.x1!,
              y0: n.y0!,
              y1: n.y1!,
              isRotated: n.isRotated || false
          };
      });
      
      // Save link offsets
      const linksMap = { ...linkOffsets };

      onSaveLayout({ nodes: nodesMap, links: linksMap });
      alert("Layout saved! Settings will apply to other years/updates.");
  };

  // Expose the save method to parent via ref
  useImperativeHandle(ref, () => ({
    saveLayout: handleSaveClick
  }));


  // --- 5. Render & Interactions ---
  useEffect(() => {
    if (!routedGraph || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { nodes, links } = routedGraph;

    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const linkHandlesGroup = svg.append("g").attr("class", "link-handles"); 
    const labelGroup = svg.append("g").attr("class", "custom-labels");

    // Path Logic: Extract control points calculation for reuse
    const getControlPoints = (s: any, t: any) => {
        const dist = Math.sqrt(Math.pow(t.x - s.x, 2) + Math.pow(t.y - s.y, 2)) * 0.5;
        let cp1x = s.x, cp1y = s.y;
        let cp2x = t.x, cp2y = t.y;

        switch(s.side) {
            case 'right': cp1x += dist; break;
            case 'left': cp1x -= dist; break;
            case 'bottom': cp1y += dist; break;
            case 'top': cp1y -= dist; break;
        }

        switch(t.side) {
            case 'right': cp2x += dist; break;
            case 'left': cp2x -= dist; break;
            case 'bottom': cp2y += dist; break;
            case 'top': cp2y -= dist; break;
        }
        return { cp1x, cp1y, cp2x, cp2y };
    };

    const getPath = (d: SankeyLink) => {
        const s = d.sourceCoords!;
        const t = d.targetCoords!;
        const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(s, t);
        return `M${s.x},${s.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${t.x},${t.y}`;
    };

    const getMidPoint = (d: SankeyLink) => {
        const s = d.sourceCoords!;
        const t = d.targetCoords!;
        const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(s, t);
        // Bezier midpoint at t=0.5
        const x = 0.125 * s.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * t.x;
        const y = 0.125 * s.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * t.y;
        return { x, y };
    };

    const getColor = (type: string) => {
      switch (type) {
        case 'domestic': return settings.colorDomestic;
        case 'trade': return settings.colorTrade;
        case 'loss': return settings.colorLoss;
        default: return '#999';
      }
    };

    // LINKS
    const linkSelection = linkGroup.selectAll("g")
      .data(links)
      .join("g");

    linkSelection.append("path")
      .attr("d", getPath)
      .attr("fill", "none")
      .attr("stroke", d => getColor(d.type))
      .attr("stroke-width", d => Math.max(1, d.width || 0))
      .attr("stroke-opacity", 0.5)
      .style("mix-blend-mode", "multiply")
      .append("title")
      .text(d => {
          // Use realValue if available, otherwise value
          const val = d.realValue !== undefined ? d.realValue : d.value;
          return `${(d.source as SankeyNode).name} → ${(d.target as SankeyNode).name}\n${val.toFixed(1)} kt`;
      });
    
    // Link Value Labels (NEW)
    linkSelection.each(function(d) {
        // Use realValue for filtering visibility of labels too, but if it's too small, maybe don't show text box
        // However, if we forced it, we probably want to show it.
        const val = d.realValue !== undefined ? d.realValue : d.value;
        
        // Hide label if strictly 0 or very small unless it's one of the forced ones (implied by having realValue maybe?)
        // Let's stick to a visual threshold for text labels to avoid clutter
        if (val < 0.01) return; 

        const mid = getMidPoint(d);
        const g = d3.select(this);
        
        g.append("rect")
            .attr("x", mid.x - 12)
            .attr("y", mid.y - 6)
            .attr("width", 24)
            .attr("height", 12)
            .attr("rx", 3)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .style("pointer-events", "none");

        g.append("text")
            .attr("x", mid.x)
            .attr("y", mid.y)
            .attr("dy", "0.3em")
            .attr("text-anchor", "middle")
            .attr("font-size", `${settings.linkFontSize}px`) 
            .attr("fill", "#333")
            .text(val.toFixed(1)) // Display real value
            .style("pointer-events", "none");
    });


    // --- NEW: Link Drag Handles with Side Switching ---
    links.forEach(l => {
        // Source Handle
        linkHandlesGroup.append("circle")
            .datum({ link: l, type: 'source' })
            .attr("cx", l.sourceCoords!.x)
            .attr("cy", l.sourceCoords!.y)
            .attr("r", 4)
            .attr("fill", "#666")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("cursor", "crosshair")
            .attr("opacity", 0) 
            .on("mouseover", function() { d3.select(this).attr("opacity", 1); })
            .on("mouseout", function() { if(!d3.active(this)) d3.select(this).attr("opacity", 0); });

        // Target Handle
        linkHandlesGroup.append("circle")
            .datum({ link: l, type: 'target' })
            .attr("cx", l.targetCoords!.x)
            .attr("cy", l.targetCoords!.y)
            .attr("r", 4)
            .attr("fill", "#666")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("cursor", "crosshair")
            .attr("opacity", 0)
            .on("mouseover", function() { d3.select(this).attr("opacity", 1); })
            .on("mouseout", function() { if(!d3.active(this)) d3.select(this).attr("opacity", 0); });
    });

    const showLinkHandles = (nodeData: SankeyNode, show: boolean) => {
        linkHandlesGroup.selectAll("circle").filter((d: any) => 
            d.link.source === nodeData || d.link.target === nodeData
        ).attr("opacity", show ? 1 : 0);
    };

    const dragLinkHandle = d3.drag<SVGCircleElement, { link: SankeyLink, type: 'source'|'target' }>()
        .on("start", function() { d3.select(this).attr("opacity", 1).attr("fill", "red"); })
        .on("drag", function(event, d) {
            const [mouseX, mouseY] = d3.pointer(event, svgRef.current);
            
            const isSource = d.type === 'source';
            const node = isSource ? (d.link.source as SankeyNode) : (d.link.target as SankeyNode);
            const nodeW = node.x1! - node.x0!;
            const nodeH = node.y1! - node.y0!;
            const isVertical = nodeH > nodeW;

            let newSide: 'left' | 'right' | 'top' | 'bottom';
            const centerX = node.x0! + nodeW / 2;
            const centerY = node.y0! + nodeH / 2;

            if (isVertical) {
                newSide = (mouseX < centerX) ? 'left' : 'right';
            } else {
                newSide = (mouseY < centerY) ? 'top' : 'bottom';
            }

            let newOffset = 0;
            if (newSide === 'top' || newSide === 'bottom') {
                const relX = mouseX - node.x0!;
                newOffset = Math.max(0, Math.min(relX, nodeW));
            } else {
                const relY = mouseY - node.y0!;
                newOffset = Math.max(0, Math.min(relY, nodeH));
            }

            const linkKey = getLinkKey(d.link);
            setLinkOffsets(prev => ({
                ...prev,
                [linkKey]: {
                    ...prev[linkKey],
                    [isSource ? 'sourceOffset' : 'targetOffset']: newOffset,
                    [isSource ? 'sourceSide' : 'targetSide']: newSide
                }
            }));
        })
        .on("end", function() { d3.select(this).attr("fill", "#666"); });

    linkHandlesGroup.selectAll("circle").call(dragLinkHandle as any);


    // NODES
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`)
      .attr("cursor", "move")
      .on("mouseover", (e, d) => showLinkHandles(d, true))
      .on("mouseout", (e, d) => showLinkHandles(d, false));

    const rect = node.append("rect")
      .attr("width", d => Math.max(1, d.x1! - d.x0!))
      .attr("height", d => Math.max(1, d.y1! - d.y0!))
      .attr("fill", d => {
          if (d.category === 'loss') return settings.colorLoss;
          if (d.category === 'trade') return settings.colorTrade;
          if (d.category === 'end_of_life') return settings.colorDomestic; // Now green (Domestic)
          return settings.colorDomestic;
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.8);

    rect.on("contextmenu", (event, d) => {
        event.preventDefault();
        const w = d.x1! - d.x0!;
        const h = d.y1! - d.y0!;
        const cx = d.x0! + w/2;
        const cy = d.y0! + h/2;
        const newW = h; const newH = w;
        d.x0 = cx - newW/2;
        d.x1 = cx + newW/2;
        d.y0 = cy - newH/2;
        d.y1 = cy + newH/2;
        d.isRotated = !d.isRotated;
        setGraph({...graph});
    });

    const resizeHandle = node.append("circle")
        .attr("r", 6)
        .attr("cx", d => d.x1! - d.x0!)
        .attr("cy", d => d.y1! - d.y0!)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("cursor", "nwse-resize");

    if (settings.showLabels) {
        node.append("text")
            .attr("x", d => (d.x1! - d.x0!) / 2)
            .attr("y", d => (d.y1! - d.y0!) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", settings.fontSize)
            .attr("font-weight", "bold")
            .text(d => d.name)
            .style("pointer-events", "none");
    }

    // --- FIX: Smooth Dragging with Boundary Clamping ---
    const dragNode = d3.drag<SVGGElement, SankeyNode>()
        .on("start", function() { d3.select(this).raise(); })
        .on("drag", function(event, d) {
            const w = d.x1! - d.x0!;
            const h = d.y1! - d.y0!;

            // Calculate new positions based on delta
            let newX = (d.x0 || 0) + event.dx;
            let newY = (d.y0 || 0) + event.dy;

            // Clamp to canvas boundaries
            newX = Math.max(0, Math.min(width - w, newX));
            newY = Math.max(0, Math.min(height - h, newY));

            d.x0 = newX;
            d.x1 = newX + w;
            d.y0 = newY;
            d.y1 = newY + h;
            
            d3.select(this).attr("transform", `translate(${d.x0},${d.y0})`);
            setGraph({...graph}); 
        });

    node.call(dragNode as any);

    // --- FIX: Smooth Resizing with Boundary Clamping ---
    const dragResize = d3.drag<SVGCircleElement, SankeyNode>()
        .on("start", (event) => { event.sourceEvent.stopPropagation(); })
        .on("drag", function(event, d) {
            event.sourceEvent.stopPropagation();
            
            // Get mouse position relative to SVG, clamped to boundaries
            const pointer = d3.pointer(event, svgRef.current);
            const mouseX = Math.max(0, Math.min(width, pointer[0]));
            const mouseY = Math.max(0, Math.min(height, pointer[1]));

            const newW = Math.max(10, mouseX - d.x0!);
            const newH = Math.max(10, mouseY - d.y0!);
            
            d.x1 = d.x0! + newW;
            d.y1 = d.y0! + newH;
            
            const g = d3.select(this.parentNode as any);
            g.select("rect").attr("width", newW).attr("height", newH);
            g.selectAll("text").attr("x", newW/2).attr("y", (val, i) => i===0 ? newH/2 : newH/2 + settings.fontSize + 2);
            d3.select(this).attr("cx", newW).attr("cy", newH);
            setGraph({...graph});
        });
        
    resizeHandle.call(dragResize as any);

    // Custom Labels
    const labels = labelGroup.selectAll("g")
        .data(customLabels, (d: any) => d.id)
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .attr("cursor", "move");

    labels.append("text")
        .text(d => d.text)
        .attr("font-family", "sans-serif")
        .attr("font-size", settings.fontSize)
        .attr("font-weight", "bold")
        .on("dblclick", (event, d) => {
            event.stopPropagation();
            const newText = prompt("Edit text:", d.text);
            if (newText !== null) {
                const updated = customLabels.map(l => l.id === d.id ? { ...l, text: newText } : l);
                onUpdateLabels(updated);
            }
        });

    const labelDrag = d3.drag<SVGGElement, CustomLabel>()
        .on("drag", function(event, d) {
            d.x = Math.max(0, Math.min(width, event.x));
            d.y = Math.max(0, Math.min(height, event.y));
            d3.select(this).attr("transform", `translate(${d.x},${d.y})`);
        })
        .on("end", function(event, d) {
             const updated = customLabels.map(l => l.id === d.id ? { ...l, x: d.x, y: d.y } : l);
             onUpdateLabels(updated);
        });
    labels.call(labelDrag as any);
    labels.on("contextmenu", (event, d) => {
        event.preventDefault();
        if(confirm("Delete this label?")) {
            const updated = customLabels.filter(l => l.id !== d.id);
            onUpdateLabels(updated);
        }
    });

  }, [routedGraph, settings, customLabels, width, height, onUpdateLabels]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 overflow-auto relative select-none">
      <div className="absolute top-2 left-2 text-xs text-slate-400 pointer-events-none z-10 text-left">
         {savedLayout ? "🔒 Layout Locked (Saved)" : ""}
      </div>

      <svg 
        ref={svgRef} 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: '100%', height: 'auto', background: '#fff' }}
      >
      </svg>
    </div>
  );
});

export default SankeyDiagram;