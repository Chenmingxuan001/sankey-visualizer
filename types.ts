export interface NdDataRow {
  year: number;
  'domestic-ore': number;
  'trade-concentrate': number;
  'domestic-concentrate': number;
  'loss-concentrate': number;
  'trade-metal': number;
  'domestic-metal': number;
  'loss-metal': number;
  'permanent magnets-ex(kt)': number;
  'permanent magnets-im(kt)': number;
  'share of PM': number; 
  'trade-permenent magnets': number;
  'domestic-permenent magnets': number;
  'domestic-other semi-products': number;
  'output-other semi-products'?: number; 
  'loss-permenent magnets': number;
  'domestic-other finalproducts': number;
  'domestic-wind turbine': number;
  'trade-wind turbine': number;
  
  // New columns for Outflow
  'Wind Turbine outflow'?: number;
  'Others outflow'?: number;
  
  // New column for End of Life
  'end of life'?: number;
  'end of life to loss'?: number; // Keep for backward compatibility

  // Export aliases (alternative column names)
  'export-concentrate'?: number;
  'export-metal'?: number;
  'export-permenent magnets'?: number;
  'export-wind turbine'?: number;
  'export-other semi-products'?: number;
  'export-other finalproducts'?: number;

  [key: string]: number | string | undefined; 
}

export interface SankeyNode {
  id: string; // Unique identifier for saving layout
  name: string; // Display name (can be duplicate, e.g. Export)
  category: 'process' | 'trade' | 'loss' | 'end_of_life';
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  isRotated?: boolean; 
  // Custom layout properties
  width?: number;
  height?: number;
}

export interface SankeyLink {
  index?: number;
  source: number | string | SankeyNode; 
  target: number | string | SankeyNode;
  value: number;
  realValue?: number; // Store the actual data value if different from visualization value
  type: 'domestic' | 'trade' | 'loss';
  width?: number;
  y0?: number;
  y1?: number;
  // Custom routing
  sourceCoords?: { x: number, y: number, side: 'top' | 'bottom' | 'left' | 'right' };
  targetCoords?: { x: number, y: number, side: 'top' | 'bottom' | 'left' | 'right' };
}

export interface GraphData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface CustomLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface SavedNodeLayout {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    isRotated: boolean;
}

export interface SavedLinkLayout {
    sourceOffset?: number; // Distance from the start of the edge
    targetOffset?: number;
    sourceSide?: 'left' | 'right' | 'top' | 'bottom'; // Preferred side
    targetSide?: 'left' | 'right' | 'top' | 'bottom';
}

export interface SavedLayoutMap {
    nodes: Record<string, SavedNodeLayout>;
    links: Record<string, SavedLinkLayout>; // Keyed by "SourceID-TargetID"
}

export interface VisualizationSettings {
  nodeWidth: number;
  nodePadding: number;
  fontSize: number; 
  linkFontSize: number;
  flowScale: number; 
  colorDomestic: string;
  colorTrade: string;
  colorLoss: string;
  showLabels: boolean;
  align: 'justify' | 'left' | 'right' | 'center';
}