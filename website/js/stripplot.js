function createStripPlot(data) {
  const margin = { top: 16, right: 24, bottom: 40, left: 210 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('strip-container', 390, margin);

  const regions = WHR.REGIONS_ORDER;

  const x = d3.scaleLinear().domain([2, 8.5]).range([0, innerW]);

  const y = d3.scaleBand()
    .domain(regions)
    .range([0, innerH])
    .padding(0.35);

  const tooltip = WHR.createTooltip('strip-tooltip');

  
  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format('.0f')))
    .selectAll('text').style('font-size', '0.72rem');

  g.append('text')
    .attr('x', innerW / 2).attr('y', innerH + 34)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.78rem').style('fill', '#6b7280')
    .text('Happiness Score');

  g.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .selectAll('text')
      .style('font-size', '0.7rem')
      .attr('dx', '-6px');

  g.selectAll('.lane-bg')
    .data(regions)
    .join('rect')
      .attr('class', 'lane-bg')
      .attr('x', 0)
      .attr('y', d => y(d))
      .attr('width', innerW)
      .attr('height', y.bandwidth() + y.step() * y.padding())
      .attr('fill', (d, i) => i % 2 === 0 ? '#fdf8ee' : '#ede5d0')
      .attr('rx', 3);

  const meanLines = g.append('g').attr('class', 'mean-lines');
  const dotsG = g.append('g').attr('class', 'strip-dots');

  function render(year) {
    const yearData = data.filter(d => d.Year === year && d.Region);

    const regionMeans = d3.rollup(yearData, v => d3.mean(v, d => d['Happiness Score']), d => d.Region);

    meanLines.selectAll('.mean-tick')
      .data(regions, d => d)
      .join('line')
        .attr('class', 'mean-tick')
        .attr('x1', d => x(regionMeans.get(d) || 0))
        .attr('x2', d => x(regionMeans.get(d) || 0))
        .attr('y1', d => y(d) - 2)
        .attr('y2', d => y(d) + y.bandwidth() + 2)
        .attr('stroke', d => WHR.REGION_COLORS[d])
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 0.9)
        .style('cursor', 'crosshair')
        .on('mouseover', function(event, d) {
          const mean = regionMeans.get(d) || 0;
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d}</div>` +
            `<div style="color:#93c5fd">Regional average</div>` +
            `<div class="tt-score"><b>${mean.toFixed(2)}</b></div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout',  WHR.hideTooltip(tooltip));

    meanLines.selectAll('.mean-hit')
      .data(regions, d => d)
      .join('line')
        .attr('class', 'mean-hit')
        .attr('x1', d => x(regionMeans.get(d) || 0))
        .attr('x2', d => x(regionMeans.get(d) || 0))
        .attr('y1', d => y(d) - 2)
        .attr('y2', d => y(d) + y.bandwidth() + 2)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 16)
        .style('cursor', 'crosshair')
        .on('mouseover', function(event, d) {
          const mean = regionMeans.get(d) || 0;
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d}</div>` +
            `<div style="color:#93c5fd">Regional average</div>` +
            `<div class="tt-score"><b>${mean.toFixed(2)}</b></div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout',  WHR.hideTooltip(tooltip));

    const jitter = y.bandwidth() * 0.38;
    const dots = dotsG.selectAll('.strip-dot')
      .data(yearData, d => d.Country);

    dots.enter().append('circle')
        .attr('class', 'strip-dot')
        .attr('r', 4)
        .attr('opacity', 0)
        .attr('cx', d => x(d['Happiness Score']))
        .attr('cy', d => y(d.Region) + y.bandwidth() / 2 + (Math.random() - 0.5) * jitter * 2)
      .merge(dots)
        .attr('fill', d => WHR.REGION_COLORS[d.Region] || '#9ca3af')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 6).attr('opacity', 1);
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d.Country}</div>` +
            `<div style="color:#93c5fd">${d.Region}</div>` +
            `<div class="tt-score">Score: ${d['Happiness Score'].toFixed(2)}</div>` +
            `<div>Rank: #${d['Happiness Rank']}</div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout', function() {
          d3.select(this).attr('r', 4);
          WHR.hideTooltip(tooltip)();
        })
        .transition().duration(500)
          .attr('cx', d => x(d['Happiness Score']))
          .attr('opacity', 0.8);

    dots.exit().transition().duration(300).attr('opacity', 0).remove();
  }

  render(2019);

  d3.select('#year-slider').on('input.strip', function() {
    render(+this.value);
  });
}
