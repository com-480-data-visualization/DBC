/* ===== SECTION 1: Choropleth World Map ===== */

function createMap(data) {
  const container = d3.select('#map-container');
  const width = container.node().getBoundingClientRect().width - 32;
  const height = Math.min(width * 0.55, 500);

  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height], { type: 'Sphere' });
  const path = d3.geoPath(projection);

  // Color scale: 3 (red) -> 5.5 (yellow) -> 8 (green)
  const colorScale = d3.scaleSequential()
    .domain([2.5, 8])
    .interpolator(d3.interpolateRdYlGn);

  // Tooltip
  const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

  // Build legend
  buildMapLegend(colorScale);

  // Load world TopoJSON
  const worldUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

  d3.json(worldUrl).then(world => {
    const countries = topojson.feature(world, world.objects.countries);

    // Draw country paths
    svg.selectAll('.country-path')
      .data(countries.features)
      .join('path')
      .attr('class', 'country-path')
      .attr('d', path)
      .attr('fill', '#e5e7eb')
      .on('mouseover', function(event, d) {
        const name = d.properties.name;
        const year = +d3.select('#year-slider').property('value');
        const record = findRecord(data, name, year);
        tooltip.classed('visible', true);
        if (record) {
          tooltip.html(
            `<div class="tt-country">${record.Country}</div>` +
            `<div>Region: ${record.Region}</div>` +
            `<div class="tt-score">Score: ${record['Happiness Score']}</div>` +
            `<div>Rank: #${record['Happiness Rank']}</div>`
          );
        } else {
          tooltip.html(`<div class="tt-country">${name}</div><div>No data</div>`);
        }
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', (event.pageX + 14) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        tooltip.classed('visible', false);
      });

    // Initial render
    updateMap(data, colorScale, 2019);

    // Slider interaction
    d3.select('#year-slider').on('input', function() {
      const year = +this.value;
      d3.select('#year-label').text(year);
      updateMap(data, colorScale, year);
    });
  });
}

function updateMap(data, colorScale, year) {
  const yearData = data.filter(d => d.Year === year);
  const byCountryMap = new Map();
  yearData.forEach(d => {
    byCountryMap.set(d.Country_map, d);
    byCountryMap.set(d.Country, d);
  });

  d3.selectAll('.country-path')
    .transition().duration(400)
    .attr('fill', function(d) {
      const name = d.properties.name;
      const record = byCountryMap.get(name);
      return record ? colorScale(record['Happiness Score']) : '#e5e7eb';
    });
}

function findRecord(data, geoName, year) {
  return data.find(d =>
    d.Year === year && (d.Country_map === geoName || d.Country === geoName)
  );
}

function buildMapLegend(colorScale) {
  const legend = d3.select('#map-legend');
  legend.html('');

  legend.append('span').text('2.5');

  // Create gradient bar using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 12;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = colorScale(2.5 + (i / 200) * 5.5);
    ctx.fillRect(i, 0, 1, 12);
  }
  canvas.style.borderRadius = '3px';
  canvas.className = 'legend-bar';
  legend.node().appendChild(canvas);

  legend.append('span').text('8.0');
  legend.append('span').text(' — Happiness Score').style('margin-left', '0.5rem');
}
