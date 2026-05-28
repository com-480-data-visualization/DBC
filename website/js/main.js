(async function () {

  

  const data = await d3.json('data/happiness.json');

  data.forEach(d => {
    d.Year                             = +d.Year;
    d['Happiness Score']               = +d['Happiness Score'];
    d['Happiness Rank']                = +d['Happiness Rank'];
    d['Economy (GDP per Capita)']      = +d['Economy (GDP per Capita)'];
    d['Family']                        = +d['Family'];
    d['Health (Life Expectancy)']      = +d['Health (Life Expectancy)'];
    d['Freedom']                       = +d['Freedom'];
    d['Trust (Government Corruption)'] = +d['Trust (Government Corruption)'] || 0;
    d['Generosity']                    = +d['Generosity'];
  });

  requestAnimationFrame(() => {
    createMap(data);
    createStripPlot(data);
    createFactorChart(data);
    createRadar(data);
    createBubbleChart(data);
    createFactorScatter(data);
    createTrendsChart(data);
    createRaceBar(data);
  });

  d3.select('#year-slider').on('input.yearlabel', function() {
    d3.select('#year-label').text(this.value);
  });


  const sections = document.querySelectorAll('.vis-section');
  const navLinks = document.querySelectorAll('.nav-link');

  sections.forEach(s => {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const key = entries[0].target.id.replace('section-', '');
      navLinks.forEach(link => link.classList.toggle('active', link.dataset.section === key));
    }, { rootMargin: '-40% 0px -55% 0px' }).observe(s);
  });


  const ANNOTATIONS = {
    'section-where':  '🏆 Finland, Denmark & Norway have held the top 3 spots every year.',
    'section-what':   '💡 GDP & health explain most of the score variation — generosity barely registers.',
    'section-bubble': '🌍 The wealthy cluster top-right is almost entirely Western Europe & North America.',
    'section-when':   '📉 Venezuela lost 2.1 points — the steepest single-country drop in the dataset.',
  };

  sections.forEach(section => {
    const anno = section.querySelector('.section-annotation');
    if (!anno) return;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !anno.classList.contains('shown')) {
        anno.textContent = ANNOTATIONS[section.id] || '';
        anno.classList.add('shown');
      }
    }, { rootMargin: '-10% 0px -30% 0px' }).observe(section);
  });

})();
