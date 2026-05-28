(function () {

window.createBubbleChart = function (data) {
  const margin = { top: 30, right: 24, bottom: 60, left: 60 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('bubble-container', 480, margin);


  const x = d3.scaleLinear().domain([0, 2.2]).range([0, innerW]);
  const y = d3.scaleLinear().domain([2.0, 8.2]).range([innerH, 0]);

  
  const maxRank = d3.max(data, d => d['Happiness Rank']);
  const r = d3.scaleSqrt().domain([1, maxRank]).range([22, 5]);


  WHR.addGridLines(g, y, innerW);

  g.append('g')
    .attr('class', 'bubble-grid-x')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(-innerH).tickFormat(''))
    .call(grid => grid.select('.domain').remove())
    .selectAll('line')
      .attr('stroke', '#ede5d0')
      .attr('stroke-dasharray', '3,3');

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  g.append('g')
    .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format('.1f')))
    .selectAll('text').style('font-size', '0.75rem');

  g.append('text')
    .attr('x', innerW / 2).attr('y', innerH + 46)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.85rem').style('fill', '#6b7280').style('font-weight', '600')
    .text('Economy (GDP per Capita contribution)');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -46).attr('x', -innerH / 2)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.85rem').style('fill', '#6b7280').style('font-weight', '600')
    .text('Happiness Score');


  const yearLabel = g.append('text')
    .attr('x', innerW - 10).attr('y', innerH - 10)
    .attr('text-anchor', 'end')
    .style('font-size', '4rem').style('font-weight', '800')
    .style('fill', '#e8dfc8').style('pointer-events', 'none')
    .text('2019');


  const bubblesG = g.append('g').attr('class', 'bubbles');
  const tooltip  = WHR.createTooltip('bubble-tooltip');
  let currentYear     = 2019;
  let playing         = false;
  let timer           = null;
  let highlightRegion = null;

  
  function render(year, animate) {
    const yearData = data.filter(
      d => d.Year === year && d.Region && d['Economy (GDP per Capita)'] != null
    );
    yearLabel.text(year);

    const top8 = new Set(
      [...yearData].sort((a, b) => b['Happiness Score'] - a['Happiness Score'])
        .slice(0, 8).map(d => d.Country)
    );

    const t = animate
      ? d3.transition().duration(700).ease(d3.easeQuadInOut)
      : d3.transition().duration(0);

    const groups = bubblesG.selectAll('.bubble')
      .data(yearData, d => d.Country);

    const enter = groups.enter().append('g').attr('class', 'bubble');
    enter.append('circle');
    enter.append('text').attr('class', 'bubble-label');

    const merged = enter.merge(groups);

    merged.select('circle')
      .attr('fill',   d => WHR.REGION_COLORS[d.Region] || '#9ca3af')
      .attr('stroke', d => WHR.REGION_COLORS[d.Region] || '#9ca3af')
      .attr('fill-opacity',   d => _bubbleOpacity(d, highlightRegion, 0.72))
      .attr('stroke-opacity', d => _bubbleOpacity(d, highlightRegion, 0.9))
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    merged.select('circle').transition(t)
      .attr('cx', d => x(d['Economy (GDP per Capita)']))
      .attr('cy', d => y(d['Happiness Score']))
      .attr('r',  d => r(d['Happiness Rank']));

    merged.select('.bubble-label')
      .attr('text-anchor', 'middle')
      .style('font-size', '0.55rem').style('font-weight', '600')
      .style('pointer-events', 'none').style('fill', '#1a1a2e')
      .transition(t)
      .attr('x', d => x(d['Economy (GDP per Capita)']))
      .attr('y', d => y(d['Happiness Score']) - r(d['Happiness Rank']) - 3)
      .text(d => (top8.has(d.Country) || r(d['Happiness Rank']) > 14) ? d.Country : '');

    merged
      .on('mouseover', function (event, d) {
        d3.select(this).select('circle').attr('stroke-width', 2.5).attr('fill-opacity', 1);
        tooltip.classed('visible', true).html(
          `<div class="tt-country">${d.Country}</div>` +
          `<div style="color:#93c5fd">${d.Region}</div>` +
          `<div>Happiness Score: <b>${d['Happiness Score'].toFixed(2)}</b></div>` +
          `<div>GDP contribution: <b>${d['Economy (GDP per Capita)'].toFixed(3)}</b></div>` +
          `<div>Rank: <b>#${d['Happiness Rank']}</b></div>`
        );
      })
      .on('mousemove', WHR.moveTooltip(tooltip))
      .on('mouseout', function (event, d) {
        d3.select(this).select('circle')
          .attr('stroke-width', 1)
          .attr('fill-opacity', _bubbleOpacity(d, highlightRegion, 0.72));
        WHR.hideTooltip(tooltip)();
      });

    groups.exit().remove();
  }

  render(currentYear, false);


  const slider = d3.select('#bubble-year-slider');

  slider.on('input', function () {
    currentYear = +this.value;
    d3.select('#bubble-year-label').text(currentYear);
    render(currentYear, false);
    if (playing) _stopPlay();
  });

  d3.select('#bubble-play-btn').on('click', () => playing ? _stopPlay() : _startPlay());

  function _startPlay() {
    playing = true;
    d3.select('#bubble-play-btn').text('⏸ Pause');
    if (currentYear >= 2019) {
      currentYear = 2015;
      slider.property('value', 2015);
      d3.select('#bubble-year-label').text(2015);
    }
    _step();
  }

  function _stopPlay() {
    playing = false;
    clearTimeout(timer);
    d3.select('#bubble-play-btn').text('▶ Play');
  }

  function _step() {
    if (!playing) return;
    render(currentYear, true);
    slider.property('value', currentYear);
    d3.select('#bubble-year-label').text(currentYear);
    if (currentYear < 2019) {
      currentYear++;
      timer = setTimeout(_step, 1000);
    } else {
      _stopPlay();
    }
  }

 
  window._bubbleSetRegion = function (region) {
    highlightRegion = highlightRegion === region ? null : region;
    d3.selectAll('.bubble-legend-item')
      .classed('active', d => d === highlightRegion);
    render(currentYear, false);
  };

  _buildBubbleLegend();
};


function _bubbleOpacity(d, highlightRegion, baseOpacity) {
  if (!highlightRegion) return baseOpacity;
  return d.Region === highlightRegion ? baseOpacity + 0.13 : 0.1;
}

function _buildBubbleLegend() {
  const legend = d3.select('#bubble-legend');
  legend.html('');

  WHR.REGIONS_ORDER.forEach(region => {
    legend.append('div')
      .attr('class', 'bubble-legend-item')
      .datum(region)
      .style('cursor', 'pointer')
      .on('click', (event, d) => window._bubbleSetRegion(d))
      .call(item => {
        item.append('span')
          .attr('class', 'bubble-legend-dot')
          .style('background', WHR.REGION_COLORS[region]);
        item.append('span').text(region);
      });
  });
}

})();
