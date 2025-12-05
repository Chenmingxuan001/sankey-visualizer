import { NdDataRow, GraphData, SankeyNode, SankeyLink } from '../types';

export const processYearData = (row: NdDataRow): GraphData => {
  // Define standard nodes based on the paper's flow
  const nodes: SankeyNode[] = [
    { name: 'Ore', id: 'ore', category: 'process' },                   // 0
    { name: 'Concentrate', id: 'concentrate', category: 'process' },   // 1
    { name: 'Metal', id: 'metal', category: 'process' },               // 2
    { name: 'NdFeB Magnet', id: 'magnet', category: 'process' },       // 3
    { name: 'Other Semi-products', id: 'other_semi', category: 'process' }, // 4
    { name: 'Wind Turbine', id: 'wind_turbine', category: 'process' },      // 5
    { name: 'Other Final Products', id: 'other_final', category: 'process' }, // 6
    { name: 'Loss', id: 'loss', category: 'loss' },                     // 7
    { name: 'Export', id: 'export', category: 'trade' },                // 8 (All Trade/Export)
    // New Nodes
    { name: 'End of Life', id: 'eol', category: 'end_of_life' }         // 9
  ];

  const links: SankeyLink[] = [];

  // Helper to push link with optional forceVisible flag
  const addLink = (
    source: number, 
    target: number, 
    value: number, 
    type: 'domestic' | 'trade' | 'loss', 
    forceVisible: boolean = false
  ) => {
    let absValue = Math.abs(value);
    const realValue = absValue;
    
    // If we force visibility, ensure a minimum value for the Sankey layout engine
    // but keep the realValue for display.
    // 0.25 kt is chosen as a "thin line" threshold.
    if (forceVisible && absValue < 0.25) {
        absValue = 0.25; 
    }

    if (absValue > 0.001) { 
      links.push({ 
        source: source, 
        target: target, 
        value: absValue, 
        realValue: realValue, // Store actual value for tooltips/labels
        type 
      });
    }
  };

  // 1. Ore Stage
  addLink(0, 1, row['domestic-ore'] || 0, 'domestic');

  // 2. Concentrate Stage (Beneficiation)
  // All trade flows go to Export (Node 8)
  // Support both 'trade-' and 'export-' prefixes
  const exportConcentrate = (row['trade-concentrate'] || 0) + (row['export-concentrate'] || 0);
  addLink(1, 8, exportConcentrate, 'trade'); 
  addLink(1, 7, row['loss-concentrate'] || 0, 'loss');
  addLink(1, 2, row['domestic-concentrate'] || 0, 'domestic');


  // 3. Metal Stage (Refining)
  const exportMetal = (row['trade-metal'] || 0) + (row['export-metal'] || 0);
  addLink(2, 8, exportMetal, 'trade'); 
  addLink(2, 7, row['loss-metal'] || 0, 'loss');
  
  // Mapping Update: 'domestic-metal' is flow Metal -> Magnet
  addLink(2, 3, row['domestic-metal'] || 0, 'domestic'); 
  
  // Mapping Update: 'domestic-other semi-products' is flow Metal -> Other Semi
  const otherSemiFlow = row['domestic-other semi-products'] || 0;
  addLink(2, 4, otherSemiFlow, 'domestic');


  // 4. Semi-Products Stage (Fabrication)
  // Combine export columns for Magnet: 'permanent magnets-ex', 'trade-permenent magnets', and 'export-permenent magnets'
  const magnetEx = row['permanent magnets-ex(kt)'] || 0;
  const tradeMagnet = row['trade-permenent magnets'] || 0;
  const exportMagnet = row['export-permenent magnets'] || 0;
  
  const totalMagnetExport = magnetEx + tradeMagnet + exportMagnet;

  addLink(3, 8, totalMagnetExport, 'trade'); // Magnet -> Export
  addLink(3, 7, row['loss-permenent magnets'] || 0, 'loss');
  
  // Potential Export for Other Semi-products (if data exists)
  const exportOtherSemi = row['export-other semi-products'] || 0;
  addLink(4, 8, exportOtherSemi, 'trade');

  // Flows to Final Products
  // Mapping Update: 'domestic-permenent magnets' is flow Magnet -> Wind Turbine
  addLink(3, 5, row['domestic-permenent magnets'] || 0, 'domestic');
  
  // Magnet -> Other Final Products (Assuming this remains as domestic-other finalproducts)
  addLink(3, 6, row['domestic-other finalproducts'] || 0, 'domestic');
  
  // Other Semi -> Other Final Products (Mapping Update: same as input)
  addLink(4, 6, otherSemiFlow, 'domestic');


  // 5. Final Products Stage
  const exportWindTurbine = (row['trade-wind turbine'] || 0) + (row['export-wind turbine'] || 0);
  addLink(5, 8, exportWindTurbine, 'trade'); // Wind Turbine -> Export

  // Potential Export for Other Final Products (if data exists)
  const exportOtherFinal = row['export-other finalproducts'] || 0;
  addLink(6, 8, exportOtherFinal, 'trade');

  // --- End of Life Flows ---
  
  // Outflows to End of Life (Green - Domestic)
  // FORCE VISIBLE
  // Wind Turbine -> EoL (Domestic Green)
  addLink(5, 9, row['Wind Turbine outflow'] || 0, 'domestic', true);
  // Other Final -> EoL (Domestic Green)
  addLink(6, 9, row['Others outflow'] || 0, 'domestic', true);
  
  // End of Life to Loss (Grey)
  // Check 'end of life' column first, then 'end of life to loss'
  const eolToLoss = row['end of life'] || row['end of life to loss'] || 0;
  // FORCE VISIBLE
  addLink(9, 7, eolToLoss, 'loss', true);

  return { nodes, links };
};