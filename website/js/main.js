/* ===== Main: Load data and initialize all visualizations ===== */

(async function() {
  // Load data
  const data = await d3.json('data/happiness.json');

  // Parse numeric fields
  data.forEach(d => {
    d.Year = +d.Year;
    d['Happiness Score'] = +d['Happiness Score'];
    d['Happiness Rank'] = +d['Happiness Rank'];
    d['Economy (GDP per Capita)'] = +d['Economy (GDP per Capita)'];
    d['Family'] = +d['Family'];
    d['Health (Life Expectancy)'] = +d['Health (Life Expectancy)'];
    d['Freedom'] = +d['Freedom'];
    d['Trust (Government Corruption)'] = +d['Trust (Government Corruption)'] || 0;
    d['Generosity'] = +d['Generosity'];
  });

  // Initialize visualizations
  createMap(data);
  createFactorChart(data);
  createTrendsChart(data);

  // Sticky nav active state on scroll
  const sections = document.querySelectorAll('.vis-section');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const sectionKey = id.replace('section-', '');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === sectionKey);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
})();
