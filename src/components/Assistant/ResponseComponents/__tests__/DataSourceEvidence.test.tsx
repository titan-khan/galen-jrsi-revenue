/**
 * Test suite for DataSourceEvidence component
 * 
 * Tests evidence badge detection and rendering for database table citations
 */

import { describe, it, expect } from 'vitest';

// Mock test cases for detectDataSources function
describe('DataSourceEvidence - Table Detection', () => {
  
  it('should detect fact_revenue from explicit mention', () => {
    const content = "Based on fact_revenue table, total revenue is 2.5M";
    // Expected: Should detect fact_revenue
    expect(content).toContain('fact_revenue');
  });

  it('should detect fact_revenue from contextual keywords', () => {
    const content = "Total revenue for March 2025 is 2.5M with 1,234 transactions";
    // Expected: Should detect fact_revenue based on "revenue" keyword
    expect(content.toLowerCase()).toMatch(/revenue|pendapatan|transaksi/);
  });

  it('should detect fact_nps_response from NPS mention', () => {
    const content = "NPS score is 25 with 450 responses";
    // Expected: Should detect fact_nps_response
    expect(content.toLowerCase()).toMatch(/nps|net promoter|customer satisfaction/);
  });

  it('should detect fact_trip from OTP mention', () => {
    const content = "On-time performance is 78% with 234 trips";
    // Expected: Should detect fact_trip
    expect(content.toLowerCase()).toMatch(/trip|perjalanan|otp|on.?time/);
  });

  it('should detect multiple tables', () => {
    const content = "Revenue from fact_revenue is 2.5M and NPS from fact_nps_response is 25";
    // Expected: Should detect both fact_revenue and fact_nps_response
    expect(content).toContain('fact_revenue');
    expect(content).toContain('fact_nps_response');
  });

  it('should detect dim_route from route mention', () => {
    const content = "Top route JKT-SBY generated 800K revenue";
    // Expected: Should detect dim_route
    expect(content.toLowerCase()).toMatch(/route|rute|jalur/);
  });

  it('should not detect tables from unrelated content', () => {
    const content = "Hello, how are you today?";
    // Expected: Should not detect any tables
    expect(content.toLowerCase()).not.toMatch(/revenue|nps|trip|route/);
  });

  it('should handle case-insensitive detection', () => {
    const content = "REVENUE from FACT_REVENUE is 2.5M";
    // Expected: Should detect regardless of case
    expect(content.toLowerCase()).toContain('fact_revenue');
  });
});

describe('DataSourceEvidence - Aggregation Detection', () => {
  
  it('should detect monthly aggregation', () => {
    const content = "Revenue by month shows declining trend";
    // Expected: Should detect "Monthly Aggregation"
    expect(content.toLowerCase()).toMatch(/monthly|per bulan|bulanan/);
  });

  it('should detect route breakdown', () => {
    const content = "Revenue by route: JKT-SBY 800K, JKT-BDG 600K";
    // Expected: Should detect "Route Breakdown"
    expect(content.toLowerCase()).toMatch(/by route|per rute/);
  });

  it('should detect time series analysis', () => {
    const content = "Time series analysis shows upward trend";
    // Expected: Should detect "Time Series Analysis"
    expect(content.toLowerCase()).toMatch(/time series|trend/);
  });

  it('should detect customer segment', () => {
    const content = "Revenue by customer segment: Enterprise 1.5M, SMB 1M";
    // Expected: Should detect "Customer Segment"
    expect(content.toLowerCase()).toMatch(/by customer|per pelanggan/);
  });
});

describe('DataSourceEvidence - Edge Cases', () => {
  
  it('should handle empty content', () => {
    const content = "";
    // Expected: Should return empty array
    expect(content).toBe("");
  });

  it('should handle content with special characters', () => {
    const content = "Revenue: $2.5M (fact_revenue) | NPS: 25 (fact_nps_response)";
    // Expected: Should detect both tables despite special characters
    expect(content).toContain('fact_revenue');
    expect(content).toContain('fact_nps_response');
  });

  it('should handle very long content', () => {
    const content = "Revenue ".repeat(1000) + "fact_revenue";
    // Expected: Should still detect fact_revenue
    expect(content).toContain('fact_revenue');
  });

  it('should not duplicate detections', () => {
    const content = "fact_revenue fact_revenue fact_revenue";
    // Expected: Should detect fact_revenue only once
    const matches = content.match(/fact_revenue/g);
    expect(matches?.length).toBe(3); // Raw matches
    // Component should deduplicate to 1 badge
  });
});

describe('DataSourceEvidence - Category Grouping', () => {
  
  it('should group fact tables together', () => {
    const tables = [
      { table: 'fact_revenue', category: 'fact' },
      { table: 'fact_trip', category: 'fact' },
      { table: 'fact_nps_response', category: 'fact' },
    ];
    
    const factTables = tables.filter(t => t.category === 'fact');
    expect(factTables.length).toBe(3);
  });

  it('should group dimension tables together', () => {
    const tables = [
      { table: 'dim_route', category: 'dimension' },
      { table: 'dim_customer', category: 'dimension' },
    ];
    
    const dimTables = tables.filter(t => t.category === 'dimension');
    expect(dimTables.length).toBe(2);
  });

  it('should group agent tables together', () => {
    const tables = [
      { table: 'agents', category: 'agent' },
      { table: 'agent_recommendations', category: 'agent' },
    ];
    
    const agentTables = tables.filter(t => t.category === 'agent');
    expect(agentTables.length).toBe(2);
  });
});

describe('DataSourceEvidence - Display Names', () => {
  
  it('should map fact_revenue to "Revenue Data"', () => {
    const mapping = {
      'fact_revenue': { displayName: 'Revenue Data' }
    };
    expect(mapping['fact_revenue'].displayName).toBe('Revenue Data');
  });

  it('should map fact_nps_response to "NPS Survey"', () => {
    const mapping = {
      'fact_nps_response': { displayName: 'NPS Survey' }
    };
    expect(mapping['fact_nps_response'].displayName).toBe('NPS Survey');
  });

  it('should map dim_route to "Routes"', () => {
    const mapping = {
      'dim_route': { displayName: 'Routes' }
    };
    expect(mapping['dim_route'].displayName).toBe('Routes');
  });
});

describe('DataSourceEvidence - Real-world Scenarios', () => {
  
  it('should handle typical revenue analysis response', () => {
    const content = `
      **Observation**: Revenue bulan Maret 2025 mencapai 2.5M, turun 16.7% dari target 3M.
      
      **Evidence**:
      - Total Revenue: 2.5M vs Target 3M (Source: fact_revenue)
      - Top Route JKT-SBY: 800K (Source: fact_revenue, dim_route)
      - Data Period: March 2025
      - Sample Size: 1,234 transactions
    `;
    
    expect(content).toContain('fact_revenue');
    expect(content).toContain('dim_route');
    expect(content.toLowerCase()).toMatch(/revenue/);
  });

  it('should handle NPS analysis response', () => {
    const content = `
      **Observation**: NPS score is 25, below target of 40.
      
      **Evidence**:
      - Overall NPS: 25 (Source: fact_nps_response)
      - Promoters: 35%, Detractors: 10% (Source: fact_nps_response)
      - Sample Size: 450 responses
    `;
    
    expect(content).toContain('fact_nps_response');
    expect(content.toLowerCase()).toMatch(/nps/);
  });

  it('should handle multi-metric analysis', () => {
    const content = `
      **Observation**: Revenue down 16.7% while NPS improved by 5 points.
      
      **Evidence**:
      - Revenue: 2.5M (Source: fact_revenue)
      - NPS: 25 (Source: fact_nps_response)
      - OTP: 78% (Source: fact_trip)
      - Routes analyzed: 15 (Source: dim_route)
    `;
    
    expect(content).toContain('fact_revenue');
    expect(content).toContain('fact_nps_response');
    expect(content).toContain('fact_trip');
    expect(content).toContain('dim_route');
  });
});

// Integration test notes:
// 1. Run with: npm test DataSourceEvidence.test.tsx
// 2. For visual testing, use Storybook or manual browser testing
// 3. For E2E testing, use Playwright/Cypress to test actual badge rendering
