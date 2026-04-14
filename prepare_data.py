"""
Prepare unified JSON data for the World Happiness Report visualization.
Merges all 5 CSV files (2015-2019) into a single JSON with consistent schema.
"""
import pandas as pd
import json

col_map = {
    'Country or region': 'Country',
    'Overall rank': 'Happiness Rank',
    'Score': 'Happiness Score',
    'Happiness.Rank': 'Happiness Rank',
    'Happiness.Score': 'Happiness Score',
    'Economy..GDP.per.Capita.': 'Economy (GDP per Capita)',
    'Health..Life.Expectancy.': 'Health (Life Expectancy)',
    'Trust..Government.Corruption.': 'Trust (Government Corruption)',
    'GDP per capita': 'Economy (GDP per Capita)',
    'Social support': 'Family',
    'Healthy life expectancy': 'Health (Life Expectancy)',
    'Freedom to make life choices': 'Freedom',
    'Perceptions of corruption': 'Trust (Government Corruption)',
}

keep_cols = [
    'Country', 'Region', 'Happiness Rank', 'Happiness Score',
    'Economy (GDP per Capita)', 'Family', 'Health (Life Expectancy)',
    'Freedom', 'Trust (Government Corruption)', 'Generosity', 'Year'
]

dfs = []
for year in range(2015, 2020):
    df = pd.read_csv(f'data/{year}.csv')
    df = df.rename(columns=col_map)
    df['Year'] = year
    dfs.append(df)

# Region mapping from 2015 data
region_df = pd.read_csv('data/2015.csv')[['Country', 'Region']]

all_data = pd.concat(dfs, ignore_index=True)
if 'Region' not in all_data.columns:
    all_data['Region'] = None

# Merge region info
all_data = all_data.merge(region_df, on='Country', how='left', suffixes=('', '_ref'))
all_data['Region'] = all_data['Region'].fillna(all_data.get('Region_ref'))
if 'Region_ref' in all_data.columns:
    all_data.drop(columns=['Region_ref'], inplace=True)

# Manual region fixes for countries missing from 2015
manual_regions = {
    'Taiwan Province of China': 'Eastern Asia',
    'Hong Kong S.A.R., China': 'Eastern Asia',
    'Trinidad & Tobago': 'Latin America and Caribbean',
    'Northern Cyprus': 'Western Europe',
    'North Macedonia': 'Central and Eastern Europe',
    'Gambia': 'Sub-Saharan Africa',
    'South Sudan': 'Sub-Saharan Africa',
    'Namibia': 'Sub-Saharan Africa',
    'Belize': 'Latin America and Caribbean',
    'Somalia': 'Sub-Saharan Africa',
    'Mozambique': 'Sub-Saharan Africa',
    'Lesotho': 'Sub-Saharan Africa',
    'Swaziland': 'Sub-Saharan Africa',
}
for country, region in manual_regions.items():
    all_data.loc[(all_data['Country'] == country) & (all_data['Region'].isna()), 'Region'] = region

# Keep only the columns we need
available = [c for c in keep_cols if c in all_data.columns]
all_data = all_data[available]

# Round numeric columns
numeric_cols = ['Happiness Score', 'Economy (GDP per Capita)', 'Family',
                'Health (Life Expectancy)', 'Freedom', 'Trust (Government Corruption)', 'Generosity']
for col in numeric_cols:
    if col in all_data.columns:
        all_data[col] = all_data[col].round(3)

# Country name mapping for TopoJSON compatibility
country_name_map = {
    'United States': 'United States of America',
    'Congo (Brazzaville)': 'Republic of the Congo',
    'Congo (Kinshasa)': 'Democratic Republic of the Congo',
    'Tanzania': 'United Republic of Tanzania',
    'North Cyprus': 'Northern Cyprus',
    'Taiwan Province of China': 'Taiwan',
    'Hong Kong S.A.R., China': 'Hong Kong',
    'Hong Kong S.A.R. of China': 'Hong Kong',
    'Trinidad and Tobago': 'Trinidad and Tobago',
    'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
    'North Macedonia': 'Macedonia',
    'Ivory Coast': "Côte d'Ivoire",
    'Palestinian Territories': 'Palestine',
    'Somaliland region': 'Somaliland',
    'Swaziland': 'eSwatini',
}
all_data['Country_map'] = all_data['Country'].map(country_name_map).fillna(all_data['Country'])

# Replace NaN with 0 for numeric columns, None for others
for col in numeric_cols:
    if col in all_data.columns:
        all_data[col] = all_data[col].fillna(0)

# Export
records = all_data.to_dict(orient='records')
with open('data/happiness.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=None)

print(f"Exported {len(records)} records for {all_data['Country'].nunique()} countries")
print(f"Years: {sorted(all_data['Year'].unique())}")
print(f"Missing regions: {all_data[all_data['Region'].isna()]['Country'].unique().tolist()}")
