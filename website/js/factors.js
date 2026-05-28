function createFactorChart(data) {
  const margin = { top: 30, right: 20, bottom: 130, left: 60 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('factor-container', 470, margin);

  const regions = [...new Set(data.filter(d => d.Region).map(d => d.Region))].sort();
  const select  = d3.select('#region-select');
  regions.forEach(r => select.append('option').attr('value', r).text(r));

  _buildFactorLegend();

  const tooltip = WHR.createTooltip('factor-tooltip');

  updateFactorChart(svg, data, 'all', innerW, innerH, margin, tooltip);

  select.on('change', function() {
    updateFactorChart(svg, data, this.value, innerW, innerH, margin, tooltip);
  });
}


function updateFactorChart(svg, data, region, innerW, innerH, margin, tooltip) {
  const grouped = _groupByRegion(data, region);

  const x = d3.scaleBand()
    .domain(grouped.map(d => d.name))
    .range([0, innerW])
    .padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d.total) * 1.05])
    .range([innerH, 0]);

  svg.selectAll('.chart-g').remove();
  const g = svg.append('g')
    .attr('class', 'chart-g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('dx', '-0.6em')
      .attr('dy', '0.6em')
      .style('text-anchor', 'end')
      .style('font-size', '0.72rem');

  g.append('g')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -38).attr('x', -innerH / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.8rem').style('fill', '#6b7280')
    .text('Factor contribution to score');

  grouped.forEach(item => {
    let cumY = 0;
    WHR.FACTORS.forEach(f => {
      const val = item[f.key] || 0;
      g.append('rect')
        .attr('class', 'factor-bar')
        .attr('x',      x(item.name))
        .attr('y',      y(cumY + val))
        .attr('width',  x.bandwidth())
        .attr('height', y(cumY) - y(cumY + val))
        .attr('fill',   f.color)
        .attr('rx', 1)
        .on('mouseover', () => {
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${item.name}</div>` +
            `<div>${f.label}: <b>${val.toFixed(3)}</b></div>` +
            `<div>Total: ${item.total.toFixed(2)}</div>`
          );
        })
        .on('mousemove',  WHR.moveTooltip(tooltip))
        .on('mouseout',   WHR.hideTooltip(tooltip));

      cumY += val;
    });
  });
}


function _groupByRegion(data, region) {
  const data2019 = data.filter(d => d.Year === 2019 && d.Region);

  if (region === 'all') {
    return Array.from(
      d3.group(data2019, d => d.Region),
      ([key, values]) => {
        const row = { name: key };
        WHR.FACTORS.forEach(f => { row[f.key] = d3.mean(values, d => d[f.key] || 0); });
        row.total = WHR.FACTORS.reduce((s, f) => s + (row[f.key] || 0), 0);
        return row;
      }
    ).sort((a, b) => b.total - a.total);
  }

  return data2019
    .filter(d => d.Region === region)
    .map(d => {
      const row = { name: d.Country };
      WHR.FACTORS.forEach(f => { row[f.key] = d[f.key] || 0; });
      row.total = WHR.FACTORS.reduce((s, f) => s + (row[f.key] || 0), 0);
      return row;
    })
    .sort((a, b) => b.total - a.total);
}

function _buildFactorLegend() {
  const wrap = d3.select('#factor-legend');
  wrap.html('');
  WHR.FACTORS.forEach(f => {
    const item = wrap.append('div').attr('class', 'factor-legend-item');
    item.append('span').attr('class', 'factor-legend-dot').style('background', f.color);
    item.append('span').text(f.label);
  });
}
