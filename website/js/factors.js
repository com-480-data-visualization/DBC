/* ===== SECTION 2: Factor Breakdown Stacked Bar Chart ===== */

const FACTORS = [
  { key: 'Economy (GDP per Capita)', label: 'GDP per Capita', color: '#2563eb' },
  { key: 'Family',                   label: 'Social Support', color: '#7c3aed' },
  { key: 'Health (Life Expectancy)', label: 'Health',          color: '#059669' },
  { key: 'Freedom',                  label: 'Freedom',         color: '#d97706' },
  { key: 'Trust (Government Corruption)', label: 'Trust in Gov.', color: '#dc2626' },
  { key: 'Generosity',              label: 'Generosity',      color: '#ec4899' },
];

function createFactorChart(data) {
  const container = d3.select('#factor-container');
  const width = container.node().getBoundingClientRect().width - 32;
  const height = 420;
  const margin = { top: 30, right: 20, bottom: 80, left: 50 };

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Populate region selector
  const regions = [...new Set(data.filter(d => d.Region).map(d => d.Region))].sort();
  const select = d3.select('#region-select');
  regions.forEach(r => {
    select.append('option').attr('value', r).text(r);
  });

  // Factor legend
  const legendG = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${height - 25})`);

  let lx = 0;
  FACTORS.forEach(f => {
    const g = legendG.append('g').attr('transform', `translate(${lx}, 0)`);
    g.append('rect').attr('width', 12).attr('height', 12).attr('rx', 2).attr('fill', f.color);
    g.append('text').attr('x', 16).attr('y', 10).text(f.label)
      .style('font-size', '0.7rem').style('fill', '#6b7280');
    lx += f.label.length * 6.5 + 30;
  });

  // Initial render
  updateFactorChart(svg, data, 'all', width, height, margin);

  select.on('change', function() {
    updateFactorChart(svg, data, this.value, width, height, margin);
  });
}

function updateFactorChart(svg, data, region, width, height, margin) {
  const data2019 = data.filter(d => d.Year === 2019 && d.Region);
  let grouped;

  if (region === 'all') {
    // Average by region
    const regionGroups = d3.group(data2019, d => d.Region);
    grouped = Array.from(regionGroups, ([key, values]) => {
      const avg = { name: key };
      FACTORS.forEach(f => {
        avg[f.key] = d3.mean(values, d => d[f.key] || 0);
      });
      avg.total = FACTORS.reduce((s, f) => s + (avg[f.key] || 0), 0);
      return avg;
    }).sort((a, b) => b.total - a.total);
  } else {
    // Individual countries in the region
    grouped = data2019
      .filter(d => d.Region === region)
      .map(d => {
        const row = { name: d.Country };
        FACTORS.forEach(f => { row[f.key] = d[f.key] || 0; });
        row.total = FACTORS.reduce((s, f) => s + (row[f.key] || 0), 0);
        return row;
      })
      .sort((a, b) => b.total - a.total);
  }

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom - 40;

  const x = d3.scaleBand()
    .domain(grouped.map(d => d.name))
    .range([0, innerW])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.total) * 1.05])
    .range([innerH, 0]);

  // Remove old chart group
  svg.selectAll('.chart-g').remove();
  const g = svg.append('g')
    .attr('class', 'chart-g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // X axis
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll('text')
    .attr('transform', 'rotate(-35)')
    .style('text-anchor', 'end')
    .style('font-size', '0.7rem');

  // Y axis
  g.append('g')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  // Y label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -38).attr('x', -innerH / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.8rem')
    .style('fill', '#6b7280')
    .text('Factor contribution');

  // Tooltip
  let tooltip = d3.select('.factor-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body').append('div').attr('class', 'tooltip factor-tooltip');
  }

  // Stacked bars
  grouped.forEach(item => {
    let cumY = 0;
    FACTORS.forEach(f => {
      const val = item[f.key] || 0;
      g.append('rect')
        .attr('class', 'factor-bar')
        .attr('x', x(item.name))
        .attr('y', y(cumY + val))
        .attr('width', x.bandwidth())
        .attr('height', y(cumY) - y(cumY + val))
        .attr('fill', f.color)
        .attr('rx', 1)
        .on('mouseover', function(event) {
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${item.name}</div>` +
            `<div>${f.label}: <b>${val.toFixed(3)}</b></div>` +
            `<div>Total: ${item.total.toFixed(2)}</div>`
          );
        })
        .on('mousemove', function(event) {
          tooltip
            .style('left', (event.pageX + 14) + 'px')
            .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          tooltip.classed('visible', false);
        });
      cumY += val;
    });
  });
}
