(function () {

const SWITCHABLE_FACTORS = [
  { key: 'Health (Life Expectancy)',      label: 'Health',         color: '#059669' },
  { key: 'Family',                        label: 'Social Support', color: '#7c3aed' },
  { key: 'Freedom',                       label: 'Freedom',        color: '#d97706' },
  { key: 'Trust (Government Corruption)', label: 'Trust in Gov.',  color: '#dc2626' },
  { key: 'Generosity',                    label: 'Generosity',     color: '#ec4899' },
];

window.createFactorScatter = function (data) {
  const margin = { top: 20, right: 24, bottom: 50, left: 210 };
  const { svg, g, innerW, innerH } = WHR.buildSVG('scatter-container', 430, margin);

  const regions = WHR.REGIONS_ORDER;

  const y = d3.scaleBand()
    .domain(regions)
    .range([0, innerH])
    .padding(0.3);

  let xScale = d3.scaleLinear().range([0, innerW]);

  const tooltip = WHR.createTooltip('scatter-tooltip');

  g.selectAll('.scatter-lane')
    .data(regions)
    .join('rect')
      .attr('class', 'scatter-lane')
      .attr('x', 0)
      .attr('y', d => y(d))
      .attr('width', innerW)
      .attr('height', y.bandwidth() + y.step() * y.padding())
      .attr('fill', (d, i) => i % 2 === 0 ? '#fdf8ee' : '#ede5d0')
      .attr('rx', 3);

  g.append('g')
    .call(d3.axisLeft(y).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .selectAll('text')
      .style('font-size', '0.7rem')
      .attr('dx', '-6px');

  const xAxisG = g.append('g').attr('transform', `translate(0,${innerH})`);
  const xLabel = g.append('text')
    .attr('x', innerW / 2).attr('y', innerH + 42)
    .attr('text-anchor', 'middle')
    .style('font-size', '0.8rem').style('fill', '#6b7280').style('font-weight', '600');

  const dotsG = g.append('g').attr('class', 'scatter-dots');

  const meanG = g.append('g').attr('class', 'scatter-means');

  let currentFactor = SWITCHABLE_FACTORS[0];
  let currentYear   = 2019;
  let playing       = false;
  let timer         = null;


  const controls = d3.select('#factor-scatter-controls');
  SWITCHABLE_FACTORS.forEach(f => {
    controls.append('button')
      .attr('class', 'factor-pill' + (f === currentFactor ? ' active' : ''))
      .style('border-color', f.color)
      .style('color', f === currentFactor ? '#fff' : f.color)
      .style('background', f === currentFactor ? f.color : 'transparent')
      .text(f.label)
      .on('click', function() {
        currentFactor = f;
        controls.selectAll('.factor-pill')
          .style('background', p => p === f ? f.color : 'transparent')
          .style('color',      p => p === f ? '#fff' : p.color)
          .style('border-color', p => p.color)
          .classed('active', p => p === f);
        render(currentYear, false);
      })
      .datum(f);
  });


  function render(year, animate) {
    const yearData = data.filter(d => d.Year === year && d.Region);
    const fKey     = currentFactor.key;
    const fColor   = currentFactor.color;

    xScale.domain([0, d3.max(yearData, d => d[fKey] || 0) * 1.08]);
    xAxisG.transition().duration(300)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('.2f')));
    xAxisG.selectAll('text').style('font-size', '0.72rem');
    xLabel.text(currentFactor.label + ' contribution');

    const t = animate
      ? d3.transition().duration(600).ease(d3.easeQuadInOut)
      : d3.transition().duration(0);

    const jitter = y.bandwidth() * 0.4;

    const jitterMap = new Map();
    yearData.forEach(d => {
      if (!jitterMap.has(d.Country)) {
        jitterMap.set(d.Country, (Math.random() - 0.5) * 2 * jitter);
      }
    });

    const dots = dotsG.selectAll('.s-dot').data(yearData, d => d.Country);

    dots.enter().append('circle')
        .attr('class', 's-dot')
        .attr('r', 4.5)
        .attr('opacity', 0)
        .attr('cx', d => xScale(d[fKey] || 0))
        .attr('cy', d => y(d.Region) + y.bandwidth() / 2 + (jitterMap.get(d.Country) || 0))
        .attr('stroke', '#fff').attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
      .merge(dots)
        .attr('fill', fColor)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 7).attr('opacity', 1);
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d.Country}</div>` +
            `<div style="color:#93c5fd">${d.Region}</div>` +
            `<div>${currentFactor.label}: <b>${(d[fKey] || 0).toFixed(3)}</b></div>` +
            `<div class="tt-score">Happiness: <b>${d['Happiness Score'].toFixed(2)}</b></div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout', function() {
          d3.select(this).attr('r', 4.5).attr('opacity', 0.75);
          WHR.hideTooltip(tooltip)();
        })
        .transition(t)
          .attr('cx', d => xScale(d[fKey] || 0))
          .attr('cy', d => y(d.Region) + y.bandwidth() / 2 + (jitterMap.get(d.Country) || 0))
          .attr('opacity', 0.75);

    dots.exit().transition(t).attr('opacity', 0).remove();

    const regionMeans = d3.rollup(yearData, v => d3.mean(v, d => d[fKey] || 0), d => d.Region);
    meanG.selectAll('.s-mean')
      .data(regions, d => d)
      .join('line')
        .attr('class', 's-mean')
        .attr('y1', d => y(d))
        .attr('y2', d => y(d) + y.bandwidth())
        .attr('stroke', fColor)
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 0.85)
        .style('cursor', 'crosshair')
        .on('mouseover', function(event, d) {
          const mean = regionMeans.get(d) || 0;
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d}</div>` +
            `<div style="color:#93c5fd">${currentFactor.label} average</div>` +
            `<div class="tt-score"><b>${mean.toFixed(3)}</b></div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout',  WHR.hideTooltip(tooltip))
        .transition(t)
          .attr('x1', d => xScale(regionMeans.get(d) || 0))
          .attr('x2', d => xScale(regionMeans.get(d) || 0));

    meanG.selectAll('.s-mean-hit')
      .data(regions, d => d)
      .join('line')
        .attr('class', 's-mean-hit')
        .attr('y1', d => y(d))
        .attr('y2', d => y(d) + y.bandwidth())
        .attr('stroke', 'transparent')
        .attr('stroke-width', 16)
        .style('cursor', 'crosshair')
        .on('mouseover', function(event, d) {
          const mean = regionMeans.get(d) || 0;
          tooltip.classed('visible', true).html(
            `<div class="tt-country">${d}</div>` +
            `<div style="color:#93c5fd">${currentFactor.label} average</div>` +
            `<div class="tt-score"><b>${mean.toFixed(3)}</b></div>`
          );
        })
        .on('mousemove', WHR.moveTooltip(tooltip))
        .on('mouseout',  WHR.hideTooltip(tooltip))
        .transition(t)
          .attr('x1', d => xScale(regionMeans.get(d) || 0))
          .attr('x2', d => xScale(regionMeans.get(d) || 0));
  }

  render(currentYear, false);


  function startPlay() {
    playing = true;
    d3.select('#scatter-play-btn').text('⏸ Pause');
    if (currentYear >= 2019) { currentYear = 2015; }
    step();
  }

  function stopPlay() {
    playing = false;
    clearTimeout(timer);
    d3.select('#scatter-play-btn').text('▶ Play');
  }

  function step() {
    if (!playing) return;
    render(currentYear, true);
    d3.select('#scatter-year-slider').property('value', currentYear);
    d3.select('#scatter-year-label').text(currentYear);
    if (currentYear < 2019) {
      currentYear++;
      timer = setTimeout(step, 900);
    } else {
      stopPlay();
    }
  }

  d3.select('#scatter-play-btn').on('click', () => playing ? stopPlay() : startPlay());
  d3.select('#scatter-year-slider').on('input', function() {
    currentYear = +this.value;
    d3.select('#scatter-year-label').text(currentYear);
    render(currentYear, false);
    if (playing) stopPlay();
  });

};

})();
