/* ===== SECTION 3: Temporal Trends (Multi-line chart) ===== */

function createTrendsChart(data) {
  const container = d3.select('#trends-container');
  const width = container.node().getBoundingClientRect().width - 32;
  const height = 450;
  const margin = { top: 30, right: 120, bottom: 50, left: 55 };

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Only keep countries present in all 5 years
  const countryCounts = d3.rollup(data, v => v.length, d => d.Country);
  const fullCountries = new Set(
    [...countryCounts].filter(([, c]) => c === 5).map(([k]) => k)
  );

  const filtered = data.filter(d => fullCountries.has(d.Country));

  // Compute change 2015->2019 for each country
  const pivoted = d3.group(filtered, d => d.Country);
  const changes = [...pivoted].map(([country, rows]) => {
    const s2015 = rows.find(r => r.Year === 2015);
    const s2019 = rows.find(r => r.Year === 2019);
    return {
      country,
      change: (s2019?.['Happiness Score'] || 0) - (s2015?.['Happiness Score'] || 0),
      rows: rows.sort((a, b) => a.Year - b.Year)
    };
  }).sort((a, b) => b.change - a.change);

  // Highlight: top 5 improved + top 5 declined
  const highlights = [
    ...changes.slice(0, 5),
    ...changes.slice(-5)
  ];
  const highlightSet = new Set(highlights.map(d => d.country));

  // Scales
  const x = d3.scaleLinear().domain([2015, 2019]).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([
      d3.min(filtered, d => d['Happiness Score']) - 0.3,
      d3.max(filtered, d => d['Happiness Score']) + 0.3
    ])
    .range([innerH, 0]);

  // Color for highlighted
  const colorImproved = d3.scaleOrdinal()
    .domain(changes.slice(0, 5).map(d => d.country))
    .range(['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']);
  const colorDeclined = d3.scaleOrdinal()
    .domain(changes.slice(-5).map(d => d.country))
    .range(['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca']);

  function getColor(country) {
    if (colorImproved.domain().includes(country)) return colorImproved(country);
    if (colorDeclined.domain().includes(country)) return colorDeclined(country);
    return '#d1d5db';
  }

  // Axes
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
    .selectAll('text').style('font-size', '0.85rem');

  g.append('g')
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -40).attr('x', -innerH / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.8rem').style('fill', '#6b7280')
    .text('Happiness Score');

  // Grid lines
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(8).tickSize(-innerW).tickFormat(''))
    .selectAll('line').attr('stroke', '#f3f4f6');

  // Line generator
  const line = d3.line()
    .x(d => x(d.Year))
    .y(d => y(d['Happiness Score']));

  // Tooltip
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip trends-tooltip');

  // Draw background lines (non-highlighted)
  const bgCountries = changes.filter(d => !highlightSet.has(d.country));
  g.selectAll('.bg-line')
    .data(bgCountries)
    .join('path')
    .attr('class', 'trend-line dimmed')
    .attr('d', d => line(d.rows))
    .attr('stroke', '#d1d5db')
    .on('mouseover', function(event, d) {
      d3.select(this).classed('dimmed', false).attr('stroke', '#6b7280').attr('stroke-width', 3);
      showTrendTooltip(tooltip, event, d);
    })
    .on('mousemove', function(event) {
      tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseleave', function() {
      d3.select(this).classed('dimmed', true).attr('stroke', '#d1d5db').attr('stroke-width', null);
      tooltip.classed('visible', false);
    });

  // Draw highlighted lines
  g.selectAll('.hl-line')
    .data(highlights)
    .join('path')
    .attr('class', 'trend-line highlighted')
    .attr('d', d => line(d.rows))
    .attr('stroke', d => getColor(d.country))
    .on('mouseover', function(event, d) {
      showTrendTooltip(tooltip, event, d);
    })
    .on('mousemove', (event) => {
      tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', () => tooltip.classed('visible', false));

  // End labels for highlighted lines — with collision avoidance
  const labelData = highlights.map(d => {
    const last = d.rows[d.rows.length - 1];
    return { country: d.country, rawY: y(last['Happiness Score']), color: getColor(d.country) };
  }).sort((a, b) => a.rawY - b.rawY);

  // Push overlapping labels apart (min 12px gap)
  const minGap = 12;
  for (let i = 1; i < labelData.length; i++) {
    const prev = labelData[i - 1];
    const curr = labelData[i];
    if (curr.rawY - prev.rawY < minGap) {
      const mid = (prev.rawY + curr.rawY) / 2;
      prev.rawY = mid - minGap / 2;
      curr.rawY = mid + minGap / 2;
    }
  }

  labelData.forEach(d => {
    g.append('text')
      .attr('x', x(2019) + 6)
      .attr('y', d.rawY)
      .attr('dy', '0.35em')
      .style('font-size', '0.65rem')
      .style('font-weight', '600')
      .style('fill', d.color)
      .text(d.country);
  });

  // Build legend
  buildTrendsLegend(highlights);
}

function showTrendTooltip(tooltip, event, d) {
  const first = d.rows[0];
  const last = d.rows[d.rows.length - 1];
  const change = d.change;
  const sign = change >= 0 ? '+' : '';
  tooltip.classed('visible', true).html(
    `<div class="tt-country">${d.country}</div>` +
    `<div>2015: ${first['Happiness Score']?.toFixed(2)} &rarr; 2019: ${last['Happiness Score']?.toFixed(2)}</div>` +
    `<div class="tt-score">Change: ${sign}${change.toFixed(2)}</div>`
  );
}

function buildTrendsLegend(highlights) {
  const legend = d3.select('#trends-legend');
  legend.html('<span style="font-weight:600;">Highlighted:</span> ');

  const improved = highlights.filter(d => d.change >= 0);
  const declined = highlights.filter(d => d.change < 0);

  legend.append('span').text(' Most improved: ').style('color', '#059669').style('font-weight', '600');
  improved.forEach((d, i) => {
    legend.append('span').text(d.country + (i < improved.length - 1 ? ', ' : ''));
  });

  legend.append('span').text('  |  Most declined: ').style('color', '#dc2626').style('font-weight', '600').style('margin-left', '1rem');
  declined.forEach((d, i) => {
    legend.append('span').text(d.country + (i < declined.length - 1 ? ', ' : ''));
  });
}
