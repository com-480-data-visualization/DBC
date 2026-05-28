const WHR = (() => {

  
  const FACTORS = [
    { key: 'Economy (GDP per Capita)',      label: 'GDP per Capita', color: '#2563eb' },
    { key: 'Family',                        label: 'Social Support', color: '#7c3aed' },
    { key: 'Health (Life Expectancy)',      label: 'Health',         color: '#059669' },
    { key: 'Freedom',                       label: 'Freedom',        color: '#d97706' },
    { key: 'Trust (Government Corruption)', label: 'Trust in Gov.',  color: '#dc2626' },
    { key: 'Generosity',                    label: 'Generosity',     color: '#ec4899' },
  ];

  
  const REGION_COLORS = {
    'Western Europe':                 '#2563eb',
    'North America':                  '#7c3aed',
    'Australia and New Zealand':      '#0891b2',
    'Central and Eastern Europe':     '#65a30d',
    'Eastern Asia':                   '#d97706',
    'Southeastern Asia':              '#f59e0b',
    'Latin America and Caribbean':    '#dc2626',
    'Middle East and Northern Africa':'#9333ea',
    'Southern Asia':                  '#0d9488',
    'Sub-Saharan Africa':             '#ea580c',
  };

  const REGIONS_ORDER = Object.keys(REGION_COLORS);

 
  function createTooltip(extraClass = '') {
    return d3.select('body')
      .append('div')
      .attr('class', ('tooltip ' + extraClass).trim());
  }

 
  function moveTooltip(tooltip) {
    return function(event) {
      tooltip
        .style('left', (event.pageX + 14) + 'px')
        .style('top',  (event.pageY - 10) + 'px');
    };
  }

  
  function hideTooltip(tooltip) {
    return () => tooltip.classed('visible', false);
  }

  
  function buildSVG(containerId, height, margin, padding = 32) {
    const container = d3.select('#' + containerId);
    const node   = container.node();
    const rawW   = node.getBoundingClientRect().width || node.offsetWidth || node.parentElement.getBoundingClientRect().width;
    const width  = rawW - padding;
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const svg = container.append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    return { svg, g, innerW, innerH, width };
  }

  
  function addGridLines(g, yScale, innerW, ticks = 8) {
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).ticks(ticks).tickSize(-innerW).tickFormat(''))
      .call(grid => grid.select('.domain').remove())
      .selectAll('line')
        .attr('stroke', '#ede5d0')
        .attr('stroke-dasharray', '3,3');
  }

  
  function fullCoverageCountries(data) {
    const counts = d3.rollup(data, v => v.length, d => d.Country);
    return new Set([...counts].filter(([, c]) => c === 5).map(([k]) => k));
  }

  
  function computeChanges(data) {
    return [...d3.group(data, d => d.Country)]
      .map(([country, rows]) => {
        rows = rows.sort((a, b) => a.Year - b.Year);
        const s2015 = rows.find(r => r.Year === 2015);
        const s2019 = rows.find(r => r.Year === 2019);
        return {
          country,
          change: (s2019?.['Happiness Score'] ?? 0) - (s2015?.['Happiness Score'] ?? 0),
          rows,
        };
      })
      .sort((a, b) => b.change - a.change);
  }


  return {
    FACTORS,
    REGION_COLORS,
    REGIONS_ORDER,
    createTooltip,
    moveTooltip,
    hideTooltip,
    buildSVG,
    addGridLines,
    fullCoverageCountries,
    computeChanges,
  };

})();
