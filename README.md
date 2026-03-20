# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Dafer Yassine|357825 |
| Ali El Bouiri|361629 |
|Mohamed Chafai El Alaoui |339838 |
|Dafer Mohamed Amine |357772  |

## Milestone 1 



## Dataset

The dataset we will use is the **World Happiness Report**, publicly available on [Kaggle](https://www.kaggle.com/datasets/unsdsn/world-happiness), published by the Sustainable Development Solutions Network (SDSN). It consists of **five CSV files**, one per year from 2015 to 2019, covering between 155 and 158 countries each year.

Each file contains a happiness score and rank per country, alongside **six contributing factors**: Economy (GDP per capita), Family/Social Support, Health (Life Expectancy), Freedom, Trust (Government Corruption), and Generosity. A Dystopia Residual column captures the unexplained remainder. Happiness scores are derived from the Gallup World Poll's Cantril ladder question, where respondents rate their lives from 0 (worst possible life) to 10 (best possible life).

**Data quality** is generally high. It is a well-maintained, widely cited academic dataset with no missing values in the core columns. The main preprocessing challenge is **schema inconsistency across years**: column names differ slightly (e.g. `Family` vs. `Social support`), and the 2015–2016 files include a `Region` column that is absent in 2017–2019, requiring manual re-mapping. A unified, cleaned dataframe merging all five years will be needed before visualisation.

---

## Problematic

Happiness is one of the most universally sought-after human experiences, yet it remains poorly understood at a societal level. What makes entire nations happier than others? Is it wealth? Freedom? Health? Social bonds? And has anything changed over the last few years?

The goal of this visualisation is to turn the World Happiness Report data (2015–2019) into an **accessible, story-driven exploration** of these questions. Rather than presenting a static ranking of countries, we want to guide the user through three interconnected questions:

- **Where** is happiness concentrated in the world?
- **What** factors explain it best? And does this vary by region?
- **When** did things change, and for which countries?

The visualisation will take the form of an **interactive web experience** structured as a narrative journey. Users will first encounter a global map giving an overview of happiness distribution, then dive into a factor explorer revealing the relative weight of GDP, freedom, health, generosity, and governance, and finally follow temporal trends across the five years of data.

The **target audience** is the general public: curious, non-expert readers who want to engage with data about human wellbeing in an intuitive and visually compelling way. No prior knowledge of statistics or economics is assumed. The tone is exploratory and humanistic rather than academic, closer to a data journalism piece than a research dashboard.

---

## Exploratory Data Analysis

The five CSV files were loaded and unified into a single dataframe of **782 country-year records** covering 170 unique countries. Minor preprocessing was required: column names were standardised across years (e.g. `Social support` → `Family`, `Score` → `Happiness Score`), and the `Region` column, present only in the 2015–2016 files, was re-mapped to all years via a country-level join. Some auxiliary columns such as `Standard Error`, `Dystopia Residual`, and confidence intervals are only present in a subset of years and were not used in the analysis. One meaningful missing value was found in the 2018 `Perceptions of corruption` column and was left as NaN, as it concerns a single country-year and does not affect visualisation. 

**Score distribution:** Happiness scores range from **2.69 to 7.77** across all years, with a global mean consistently around 5.37–5.41. The distribution is roughly symmetric with a slight right skew. The global average has remained remarkably stable over the five years, inching from 5.376 in 2015 to 5.407 in 2019.

**Regional disparities are stark:** Australia & New Zealand (7.27) and North America (7.09) lead, while Sub-Saharan Africa (4.32) and Southern Asia (4.53) trail significantly,  a gap of nearly 3 points on the same 0–10 scale.

| Region | Avg. Score (2019) |
|---|---|
| Australia and New Zealand | 7.27 |
| North America | 7.09 |
| Western Europe | 6.90 |
| Latin America and Caribbean | 5.94 |
| Eastern Asia | 5.69 |
| Central and Eastern Europe | 5.57 |
| Southeastern Asia | 5.27 |
| Middle East and Northern Africa | 5.24 |
| Southern Asia | 4.53 |
| Sub-Saharan Africa | 4.32 |

**Factor correlations:** GDP per capita (*r* = 0.794), Health/Life Expectancy (*r* = 0.780), and Family/Social Support (*r* = 0.777) are by far the strongest predictors of happiness. Freedom has moderate correlation (*r* = 0.567), while Trust in Government (*r* = 0.386) and Generosity (*r* = 0.076) contribute comparatively little.

| Factor | Correlation with happiness score |
|---|---|
| Economy (GDP per Capita) | 0.794 |
| Health (Life Expectancy) | 0.780 |
| Family / Social Support | 0.777 |
| Freedom | 0.567 |
| Trust (Government Corruption) | 0.386 |
| Generosity | 0.076 |

**Temporal changes:** Venezuela experienced the sharpest decline (−2.10 points), while Benin showed the most notable improvement (+1.54 points) between 2015 and 2019. In total, **141 countries** appear consistently across all five years, enabling reliable longitudinal comparisons.

Notebook with full EDA: [eda_happiness.ipynb](eda_happiness.ipynb)

---

## Related Work

The World Happiness Report dataset is widely used in data science education and has been explored extensively on Kaggle, where dozens of notebooks present static bar charts of country rankings, scatter plots of GDP vs. happiness, and basic correlation heatmaps. The official WHR website ([worldhappiness.report](https://worldhappiness.report)) publishes its own visualisations, primarily static choropleth maps and ranking tables. Journalistic outlets such as *Our World in Data* have also covered the topic with clean, interactive time-series charts focused on individual countries or broad regional trends.

However, most existing treatments share a common limitation: they present the data either as a **snapshot** (one year, one ranking) or as a **single-variable explorer** (one factor vs. one score). None combine the 3 dimensions of *where*, *what*, and *when* into a unified narrative experience aimed at a general audience.

Our approach is original in three ways:

1. We frame the visualisation as a **guided story** rather than a dashboard, leading the user through a curated sequence of insights rather than leaving them with a blank query interface.
2. We foreground the **factor breakdown**,
 showing not just which countries rank highest, but *why*, and whether the drivers of happiness differ systematically across regions.
3. We explicitly incorporate the **temporal dimension** across all five years, allowing users to observe which countries have gained or lost ground and in what context.

For visual inspiration, we draw on the narrative scrollytelling style of [*The Pudding*](https://pudding.cool), the clean geographic storytelling of [*Our World in Data*](https://ourworldindata.org), and the layered interactivity of Hans Rosling's [Gapminder](https://www.gapminder.org/tools/) tool, which similarly encodes multiple variables (size, colour, position, time) into a single animated view.