function createRaceBar(data) {
  const N      = 15; 
  const margin = { top: 10, right: 100, bottom: 30, left: 130 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('race-container', 480, margin);

  const tooltip = WHR.createTooltip('race-tooltip');

  const years = [2015, 2016, 2017, 2018, 2019];

  function topN(year) {
    return data
      .filter(d => d.Year === year)
      .sort((a, b) => a['Happiness Rank'] - b['Happiness Rank'])
      .slice(0, N);
  }

  const x = d3.scaleLinear().domain([0, 8.8]).range([0, innerW]);

  const barH = innerH / N * 0.82;

  const xAxisG = g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('.1f')));
  xAxisG.selectAll('text').style('font-size', '0.72rem');

  const yearWatermark = g.append('text')
    .attr('x', innerW - 8).attr('y', innerH - 12)
    .attr('text-anchor', 'end')
    .style('font-size', '3.5rem').style('font-weight', '800')
    .style('fill', '#e8dfc8').style('pointer-events', 'none')
    .text('2019');

  let currentYear = 2019;
  let playing     = false;
  let timer       = null;

  function yPos(rank) {
    
    return (rank - 1) * (innerH / N);
  }

  function render(year, animate) {
    const entries = topN(year);
    yearWatermark.text(year);

    const t = animate
      ? d3.transition().duration(750).ease(d3.easeQuadInOut)
      : d3.transition().duration(0);

    const bars = g.selectAll('.race-bar')
      .data(entries, d => d.Country);

    bars.enter().append('rect')
        .attr('class', 'race-bar')
        .attr('rx', 3)
        .attr('x', 0)
        .attr('y', (d, i) => yPos(i + 1))
        .attr('height', barH)
        .attr('width', 0)
        .attr('fill', d => WHR.REGION_COLORS[d.Region] || '#9ca3af')
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 1);
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d.Country}</div>` +
            `<div style="color:#93c5fd">${d.Region}</div>` +
            `<div class="tt-score">Score: ${d['Happiness Score'].toFixed(2)}</div>` +
            `<div>Rank: #${d['Happiness Rank']}</div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 0.85);
          WHR.hideTooltip(tooltip)();
        })
      .merge(bars)
        .attr('fill', d => WHR.REGION_COLORS[d.Region] || '#9ca3af')
        .transition(t)
          .attr('y', (d, i) => yPos(i + 1))
          .attr('width', d => x(d['Happiness Score']))
          .attr('height', barH);

    bars.exit().transition(t).attr('width', 0).attr('opacity', 0).remove();

    const labels = g.selectAll('.race-label')
      .data(entries, d => d.Country);

    labels.enter().append('text')
        .attr('class', 'race-label')
        .attr('x', -6)
        .attr('text-anchor', 'end')
        .style('font-size', '0.68rem').style('font-weight', '600')
        .style('fill', '#374151')
      .merge(labels)
      .transition(t)
        .attr('y', (d, i) => yPos(i + 1) + barH / 2)
        .attr('dy', '0.35em')
        .text(d => d.Country);

    labels.exit().transition(t).attr('opacity', 0).remove();

    const scoreLabels = g.selectAll('.race-score')
      .data(entries, d => d.Country);

    scoreLabels.enter().append('text')
        .attr('class', 'race-score')
        .style('font-size', '0.65rem').style('fill', '#6b7280')
      .merge(scoreLabels)
      .transition(t)
        .attr('x', d => x(d['Happiness Score']) + 4)
        .attr('y', (d, i) => yPos(i + 1) + barH / 2)
        .attr('dy', '0.35em')
        .text(d => d['Happiness Score'].toFixed(2));

    scoreLabels.exit().transition(t).attr('opacity', 0).remove();
  }

  render(currentYear, false);


  function startPlay() {
    playing = true;
    d3.select('#race-play-btn').text('⏸ Pause');
    if (currentYear >= 2019) { currentYear = 2015; }
    step();
  }

  function stopPlay() {
    playing = false;
    clearTimeout(timer);
    d3.select('#race-play-btn').text('▶ Play');
  }

  function step() {
    if (!playing) return;
    render(currentYear, true);
    d3.select('#race-year-slider').property('value', currentYear);
    d3.select('#race-year-display').text(currentYear);
    if (currentYear < 2019) {
      currentYear++;
      timer = setTimeout(step, 900);
    } else {
      stopPlay();
    }
  }

  d3.select('#race-play-btn').on('click', () => playing ? stopPlay() : startPlay());

  d3.select('#race-year-slider').on('input', function() {
    currentYear = +this.value;
    d3.select('#race-year-display').text(currentYear);
    render(currentYear, false);
    if (playing) stopPlay();
  });
}
