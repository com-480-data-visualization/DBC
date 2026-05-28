function createTrendsChart(data) {
  const margin = { top: 30, right: 140, bottom: 50, left: 55 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('trends-container', 450, margin);

  const fullCountries = WHR.fullCoverageCountries(data);
  const filtered      = data.filter(d => fullCountries.has(d.Country));

  const changes   = WHR.computeChanges(filtered);
  const highlights = [...changes.slice(0, 5), ...changes.slice(-5)];
  const highlightSet = new Set(highlights.map(d => d.country));


  const x = d3.scaleLinear().domain([2015, 2019]).range([0, innerW]);
  const y = d3.scaleLinear()
    .domain([
      d3.min(filtered, d => d['Happiness Score']) - 0.3,
      d3.max(filtered, d => d['Happiness Score']) + 0.3,
    ])
    .range([innerH, 0]);

  const colorImproved = d3.scaleOrdinal()
    .domain(changes.slice(0, 5).map(d => d.country))
    .range(['#059669', '#10b981', '#34d399', '#6ee7b7', '#86efac']);
  const colorDeclined = d3.scaleOrdinal()
    .domain(changes.slice(-5).map(d => d.country))
    .range(['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca']);

  
  function getColor(country) {
    if (colorImproved.domain().includes(country)) return colorImproved(country);
    if (colorDeclined.domain().includes(country)) return colorDeclined(country);
    return '#d1d5db';
  }


  WHR.addGridLines(g, y, innerW);

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
    .selectAll('text').style('font-size', '0.85rem');

  g.append('g')
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -42).attr('x', -innerH / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.8rem').style('fill', '#6b7280')
    .text('Happiness Score');


  const tooltip         = WHR.createTooltip('trends-tooltip');
  const line            = d3.line().x(d => x(d.Year)).y(d => y(d['Happiness Score']));
  let   selectedCountries = new Set();


  const allCountries = [...new Set(filtered.map(d => d.Country))].sort();
  allCountries.forEach(c => d3.select('#trends-datalist').append('option').attr('value', c));

  d3.select('#trends-search').on('input', function () {
    const val = this.value.trim();
    if (allCountries.includes(val)) {
      _toggleCountry(val);
      this.value = '';
    }
  });


  function drawLines() {
    const pinned = [...selectedCountries];

    const bgData = changes.filter(d => !highlightSet.has(d.country) && !selectedCountries.has(d.country));
    const dimmed = selectedCountries.size > 0;

    g.selectAll('.bg-line')
      .data(bgData, d => d.country)
      .join('path')
        .attr('class', 'trend-line dimmed bg-line')
        .attr('d', d => line(d.rows))
        .attr('stroke', '#d1d5db')
        .attr('stroke-opacity', dimmed ? 0.3 : 1)
        .on('mouseover', function (event, d) {
          d3.select(this).classed('dimmed', false).attr('stroke', '#6b7280').attr('stroke-width', 3);
          _showTrendTooltip(tooltip, d);
          tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove',  WHR.moveTooltip(tooltip))
        .on('mouseleave', function (event, d) {
          d3.select(this).classed('dimmed', true).attr('stroke', '#d1d5db').attr('stroke-width', null);
          WHR.hideTooltip(tooltip)();
        })
        .on('click', (event, d) => _toggleCountry(d.country));

    const hlData = [
      ...highlights,
      ...changes.filter(d => selectedCountries.has(d.country) && !highlightSet.has(d.country)),
    ];

    g.selectAll('.hl-line')
      .data(hlData, d => d.country)
      .join('path')
        .attr('class', 'trend-line highlighted hl-line')
        .attr('d', d => line(d.rows))
        .attr('stroke', d => selectedCountries.has(d.country) ? '#1d4ed8' : getColor(d.country))
        .attr('stroke-opacity', d => (dimmed && !selectedCountries.has(d.country)) ? 0.15 : 1)
        .on('mouseover', (event, d) => {
          _showTrendTooltip(tooltip, d);
          tooltip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove',  WHR.moveTooltip(tooltip))
        .on('mouseout',   WHR.hideTooltip(tooltip))
        .on('click',      (event, d) => _toggleCountry(d.country));

    _drawEndLabels(g, hlData, x, y, innerW, getColor);
    _renderChips();
  }

  function _toggleCountry(country) {
    selectedCountries.has(country)
      ? selectedCountries.delete(country)
      : selectedCountries.add(country);
    drawLines();
  }

  function _renderChips() {
    const chips = d3.select('#trends-chips');
    chips.selectAll('.chip').remove();
    selectedCountries.forEach(c => {
      chips.append('div').attr('class', 'chip')
        .html(`${c} <span class="chip-x">✕</span>`)
        .on('click', () => _toggleCountry(c));
    });
  }

  drawLines();
  _buildTrendsLegend(highlights, getColor);
}


function _drawEndLabels(g, hlData, x, y, innerW, getColor) {
  g.selectAll('.end-label').remove();

  const labels = hlData
    .map(d => ({
      country: d.country,
      rawY:    y(d.rows.at(-1)['Happiness Score']),
      color:   getColor(d.country),
    }))
    .sort((a, b) => a.rawY - b.rawY);

  const MIN_GAP = 12;
  for (let i = 1; i < labels.length; i++) {
    const prev = labels[i - 1], curr = labels[i];
    if (curr.rawY - prev.rawY < MIN_GAP) {
      const mid  = (prev.rawY + curr.rawY) / 2;
      prev.rawY  = mid - MIN_GAP / 2;
      curr.rawY  = mid + MIN_GAP / 2;
    }
  }

  labels.forEach(d => {
    g.append('text').attr('class', 'end-label')
      .attr('x', x(2019) + 6).attr('y', d.rawY).attr('dy', '0.35em')
      .style('font-size', '0.62rem').style('font-weight', '600').style('fill', d.color)
      .text(d.country);
  });
}

function _showTrendTooltip(tooltip, d) {
  const first  = d.rows[0];
  const last   = d.rows.at(-1);
  const sign   = d.change >= 0 ? '+' : '';
  tooltip.classed('visible', true).html(
    `<div class="tt-country">${d.country}</div>` +
    `<div>2015: ${first['Happiness Score'].toFixed(2)} → 2019: ${last['Happiness Score'].toFixed(2)}</div>` +
    `<div class="tt-score">Change: ${sign}${d.change.toFixed(2)}</div>` +
    `<small style="color:#9ca3af">Click to pin</small>`
  );
}

function _buildTrendsLegend(highlights, getColor) {
  const legend   = d3.select('#trends-legend');
  const improved = highlights.filter(d => d.change >= 0);
  const declined = highlights.filter(d => d.change < 0);

  legend.html('');
  legend.append('span').text('Most improved: ').style('color', '#059669').style('font-weight', '600');
  improved.forEach((d, i) => legend.append('span').text(d.country + (i < improved.length - 1 ? ', ' : '')));

  legend.append('span').style('margin-left', '0.75rem').text('  |  Most declined: ').style('color', '#dc2626').style('font-weight', '600');
  declined.forEach((d, i) => legend.append('span').text(d.country + (i < declined.length - 1 ? ', ' : '')));
}
