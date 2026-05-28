
function createMap(data) {
  const container = d3.select('#map-container');
  const node   = container.node();
  const width  = (node.getBoundingClientRect().width || node.offsetWidth || 900) - 32;
  const height = Math.min(width * 0.55, 500);

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' });
  const path       = d3.geoPath(projection);

  const colorScale = d3.scaleSequential()
    .domain([2.5, 8])
    .interpolator(d3.interpolateRdYlGn);

  const tooltip = WHR.createTooltip('map-tooltip');
  const panel   = d3.select('#map-detail-panel');

  _buildMapLegend(colorScale);

  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    svg.selectAll('.country-path')
      .data(countries.features)
      .join('path')
        .attr('class', 'country-path')
        .attr('d', path)
        .attr('fill', '#e8dfc8')
        .on('mouseover', (event, d) => _onMapHover(event, d, data, tooltip))
        .on('mousemove',  WHR.moveTooltip(tooltip))
        .on('mouseout',   WHR.hideTooltip(tooltip))
        .on('click',      (event, d) => _onMapClick(d, data, panel));

    updateMap(data, colorScale, 2019);

    d3.select('#year-slider').on('input', function() {
      const year = +this.value;
      d3.select('#year-label').text(year);
      updateMap(data, colorScale, year);

      const pinned = panel.attr('data-country');
      if (pinned) {
        const record = data.find(d => d.Country === pinned && d.Year === year);
        if (record) _showDetailPanel(data, record, panel);
      }
    });
  });

  d3.select('#map-detail-close').on('click', () => {
    panel.classed('visible', false).attr('data-country', null);
  });
}


function _onMapHover(event, d, data, tooltip) {
  const name   = d.properties.name;
  const year   = +d3.select('#year-slider').property('value');
  const record = _findRecord(data, name, year);

  tooltip.classed('visible', true);
  if (record) {
    tooltip.html(
      `<div class="tt-country">${record.Country}</div>` +
      `<div>${record.Region}</div>` +
      `<div class="tt-score">Score: ${record['Happiness Score'].toFixed(2)}</div>` +
      `<div>Rank: #${record['Happiness Rank']}</div>` +
      `<small style="color:#9ca3af">Click for details</small>`
    );
  } else {
    tooltip.html(`<div class="tt-country">${name}</div><div>No data for this year</div>`);
  }
}

function _onMapClick(d, data, panel) {
  const name   = d.properties.name;
  const year   = +d3.select('#year-slider').property('value');
  const record = _findRecord(data, name, year);
  if (record) _showDetailPanel(data, record, panel);
}


function _showDetailPanel(data, record, panel) {
  panel.attr('data-country', record.Country);

  const countryRows = data
    .filter(d => d.Country === record.Country)
    .sort((a, b) => a.Year - b.Year);

  const scoreChange = countryRows.length >= 2
    ? (countryRows.at(-1)['Happiness Score'] - countryRows[0]['Happiness Score']).toFixed(2)
    : null;
  const sign = scoreChange >= 0 ? '+' : '';

  panel.html(`
    <div class="panel-header">
      <div>
        <div class="panel-country">${record.Country}</div>
        <div class="panel-region">${record.Region}</div>
      </div>
      <button id="map-detail-close" class="panel-close">✕</button>
    </div>
    <div class="panel-score">
      <span class="panel-score-num">${record['Happiness Score'].toFixed(2)}</span>
      <span class="panel-score-label">score in ${record.Year}</span>
      ${scoreChange !== null
        ? `<span class="panel-change ${scoreChange >= 0 ? 'pos' : 'neg'}">${sign}${scoreChange} since 2015</span>`
        : ''}
    </div>
    <div class="panel-factors">
      ${WHR.FACTORS.map(f => {
        const val = record[f.key] || 0;
        const pct = (val / 2.1 * 100).toFixed(1);
        return `<div class="pf-row">
          <span class="pf-label">${f.label}</span>
          <div class="pf-bar-wrap">
            <div class="pf-bar" style="width:${pct}%;background:${f.color}"></div>
          </div>
          <span class="pf-val">${val.toFixed(3)}</span>
        </div>`;
      }).join('')}
    </div>
    <div class="panel-spark-label">Score trend (2015–2019)</div>
    <svg id="panel-sparkline" width="100%" height="60" viewBox="0 0 220 60"></svg>
  `);

  d3.select('#map-detail-close').on('click', () => {
    panel.classed('visible', false).attr('data-country', null);
  });

  _drawSparkline(countryRows);
  panel.classed('visible', true);
}

function _drawSparkline(rows) {
  if (rows.length < 2) return;

  const svgEl = d3.select('#panel-sparkline');
  const sx = d3.scaleLinear().domain([2015, 2019]).range([10, 210]);
  const sy = d3.scaleLinear()
    .domain([
      d3.min(rows, d => d['Happiness Score']) - 0.3,
      d3.max(rows, d => d['Happiness Score']) + 0.3,
    ])
    .range([50, 10]);

  const line = d3.line()
    .x(d => sx(d.Year))
    .y(d => sy(d['Happiness Score']))
    .curve(d3.curveMonotoneX);

  svgEl.append('path').datum(rows)
    .attr('fill', 'none')
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2)
    .attr('d', line);

  svgEl.selectAll('circle').data(rows).join('circle')
    .attr('cx', d => sx(d.Year))
    .attr('cy', d => sy(d['Happiness Score']))
    .attr('r', 3)
    .attr('fill', '#2563eb');

  svgEl.selectAll('.spark-val').data(rows).join('text')
    .attr('class', 'spark-val')
    .attr('x', d => sx(d.Year))
    .attr('y', d => sy(d['Happiness Score']) - 6)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.55rem')
    .style('fill', '#6b7280')
    .text(d => d['Happiness Score'].toFixed(1));
}

function updateMap(data, colorScale, year) {
  const yearIndex = new Map();
  data.filter(d => d.Year === year).forEach(d => {
    yearIndex.set(d.Country_map, d);
    yearIndex.set(d.Country, d);
  });

  d3.selectAll('.country-path')
    .transition().duration(500)
    .attr('fill', d => {
      const record = yearIndex.get(d.properties.name);
      return record ? colorScale(record['Happiness Score']) : '#e8dfc8';
    });
}


function _findRecord(data, geoName, year) {
  return data.find(d =>
    d.Year === year && (d.Country_map === geoName || d.Country === geoName)
  );
}

function _buildMapLegend(colorScale) {
  const legend = d3.select('#map-legend');
  legend.html('');
  legend.append('span').text('2.5');

  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 12;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = colorScale(2.5 + (i / 200) * 5.5);
    ctx.fillRect(i, 0, 1, 12);
  }
  canvas.style.borderRadius = '3px';
  canvas.className = 'legend-bar';
  legend.node().appendChild(canvas);

  legend.append('span').text('8.0');
  legend.append('span').text('Happiness Score').style('margin-left', '0.5rem');
  legend.append('span')
    .style('margin-left', '1rem')
    .style('color', '#9ca3af')
    .text('Click a country for details');
}
