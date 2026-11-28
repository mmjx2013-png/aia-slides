# Credits: geo-thailand

## Map data
- **Natural Earth** (public domain, naturalearthdata.com), from the `geojson/` folder of github.com/nvkelso/natural-earth-vector:
  - `ne_10m_admin_1_states_provinces`: Thailand's 77 provinces, dissolved by `geo.py` into the 6 regions.
  - `ne_50m_admin_0_countries`: the neighbouring countries.
  - `ne_10m_rivers_lake_centerlines`: the main rivers.
  - `ne_10m_geography_regions_polys`: the Khorat Plateau outline.
- The regions follow the 6-region system taught in Thai schools. Natural Earth lists Nakhon Nayok as "Eastern"; this deck puts it in ภาคกลาง (Central), as the 6-region system does.
- The contour lines are **illustrative**, and the slide says so. Natural Earth has no elevation data, so `geo.py` draws them from a smooth surface built along the main mountain ranges and the Khorat Plateau.
- Projection, dissolving and simplifying are our own work (`geo.py`).

## Climate figures (slide 3)
- Thai Meteorological Department (กรมอุตุนิยมวิทยา), climatological normals for 1991–2020 (พ.ศ. 2534–2563), Bangkok Metropolis station 48455. Used: mean monthly rainfall and the mean daily maximum and minimum temperatures.
- The seasons follow the TMD definitions: summer from mid-February to mid-May, rainy season from mid-May to mid-October, and cool season from mid-October to mid-February.
- The rainfall figures were cross-checked against a second copy of the same normals (the Wikipedia climate table, which cites NOAA/WMO). The two sources agree on rainfall. October's mean maximum temperature is 33.0 °C in the TMD figures and 33.3 °C in the second source; this deck uses the TMD value.

## Everything else
The illustrations, the text and the code are our own. No photographs are used.
