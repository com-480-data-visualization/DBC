function createRadar(data) {
  const size   = 500;
  const cx     = size / 2;
  const cy     = size / 2;
  const radius = 160;
  const levels = 5;

  const container = d3.select('#radar-container');
  const svg = container.append('svg')
    .attr('viewBox', `0 0 ${size} ${size}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  const factors   = WHR.FACTORS;
  const n         = factors.length;
  const angleStep = (2 * Math.PI) / n;

  function angle(i) { return i * angleStep - Math.PI / 2; }
  function polar(val, i, r) {
    return [r * val * Math.cos(angle(i)), r * val * Math.sin(angle(i))];
  }

  const data2019 = data.filter(d => d.Year === 2019 && d.Region);
  const regions  = [...new Set(data2019.map(d => d.Region))];
  const maxVals  = factors.map(f => d3.max(data2019, d => d[f.key] || 0));

  function regionAvg(rows) {
    return factors.map((f, i) => {
      const avg = d3.mean(rows, d => d[f.key] || 0);
      return avg / maxVals[i];
    });
  }

  const globalAvg = regionAvg(data2019);
  const regionAvgs = {};
  regions.forEach(r => {
    regionAvgs[r] = regionAvg(data2019.filter(d => d.Region === r));
  });

  const tooltip = WHR.createTooltip('radar-tooltip');

  
  for (let lvl = 1; lvl <= levels; lvl++) {
    const r   = (radius / levels) * lvl;
    const pts = factors.map((_, i) => polar(1, i, r).join(',')).join(' ');
    g.append('polygon')
      .attr('points', pts)
      .attr('fill', 'none')
      .attr('stroke', '#e8dfc8')
      .attr('stroke-width', 0.8);

    const [lx, ly] = polar(1, 0, r);
    g.append('text')
      .attr('x', lx + 4).attr('y', ly)
      .attr('dy', '0.35em')
      .style('font-size', '0.55rem')
      .style('fill', '#9ca3af')
      .text(d3.format('.0%')(lvl / levels));
  }

  factors.forEach((f, i) => {
    const [x2, y2] = polar(1, i, radius);
    g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', '#e8dfc8').attr('stroke-width', 1);

    const labelR = radius + 32;
    const [lx, ly] = polar(1, i, labelR);
    const anchor = Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end';

    g.append('text')
      .attr('x', lx).attr('y', ly)
      .attr('text-anchor', anchor)
      .attr('dy', ly > radius * 0.6 ? '1em' : ly < -radius * 0.6 ? '-0.3em' : '0.35em')
      .style('font-size', '0.68rem')
      .style('font-weight', '700')
      .style('fill', f.color)
      .text(f.label);
  });


  const globalPts = globalAvg.map((v, i) => polar(v, i, radius).join(',')).join(' ');
  g.append('polygon')
    .attr('class', 'radar-global')
    .attr('points', globalPts)
    .attr('fill', '#94a3b8')
    .attr('fill-opacity', 0.12)
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4,3');


  const regionPoly = g.append('polygon')
    .attr('class', 'radar-region')
    .attr('fill', '#2563eb')
    .attr('fill-opacity', 0.2)
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2.5);

  const hitCircles = g.selectAll('.radar-hit')
    .data(factors)
    .join('circle')
      .attr('class', 'radar-hit')
      .attr('r', 8)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

  const vertexDots = g.selectAll('.radar-dot')
    .data(factors)
    .join('circle')
      .attr('class', 'radar-dot')
      .attr('r', 4)
      .attr('fill', '#2563eb')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('pointer-events', 'none');

  function render(regionKey) {
    const vals  = regionKey === 'all' ? globalAvg : (regionAvgs[regionKey] || globalAvg);
    const color = regionKey === 'all' ? '#64748b' : (WHR.REGION_COLORS[regionKey] || '#2563eb');
    const pts   = vals.map((v, i) => polar(v, i, radius).join(',')).join(' ');

    regionPoly
      .transition().duration(500).ease(d3.easeQuadInOut)
      .attr('points', pts)
      .attr('fill', color)
      .attr('stroke', color);

    vertexDots
      .transition().duration(500).ease(d3.easeQuadInOut)
      .attr('cx', (f, i) => polar(vals[i], i, radius)[0])
      .attr('cy', (f, i) => polar(vals[i], i, radius)[1])
      .attr('fill', color);

    hitCircles
      .attr('cx', (f, i) => polar(vals[i], i, radius)[0])
      .attr('cy', (f, i) => polar(vals[i], i, radius)[1])
      .on('mouseover', function(event, f) {
        const i   = factors.indexOf(f);
        const raw = vals[i] * maxVals[i];
        tooltip.classed('visible', true).html(
          `<div class="tt-country">${f.label}</div>` +
          `<div class="tt-score">Avg: <b>${raw.toFixed(3)}</b></div>` +
          `<div style="color:#9ca3af">${regionKey === 'all' ? 'Global average' : regionKey}</div>`
        );
      })
      .on('mousemove', WHR.moveTooltip(tooltip))
      .on('mouseout',  WHR.hideTooltip(tooltip));

    svg.selectAll('.radar-legend').remove();
    const legG = svg.append('g').attr('class', 'radar-legend')
      .attr('transform', `translate(${cx}, ${size - 18})`);

    [[color, regionKey === 'all' ? 'Global average' : regionKey, false],
     ['#94a3b8', 'Global average', true]]
      .filter((_, i) => !(regionKey === 'all' && i === 0)) 
      .forEach(([col, label, dashed], i) => {
        const lx = (i - 0.5) * 160;
        legG.append('line')
          .attr('x1', lx - 18).attr('x2', lx - 4)
          .attr('y1', 0).attr('y2', 0)
          .attr('stroke', col).attr('stroke-width', 2)
          .attr('stroke-dasharray', dashed ? '4,3' : null);
        legG.append('text')
          .attr('x', lx).attr('y', 0).attr('dy', '0.35em')
          .style('font-size', '0.65rem').style('fill', '#6b7280')
          .text(label);
      });
  }

  render('all');

  d3.select('#region-select').on('change.radar', function() {
    render(this.value);
  });
}
