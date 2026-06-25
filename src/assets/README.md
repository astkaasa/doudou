# Assets

## `natural-earth-2-50m.jpg`

Compressed terrain map derived from Natural Earth 1:50m Natural Earth II with Shaded Relief.

- Source page: https://www.naturalearthdata.com/downloads/50m-raster-data/50m-natural-earth-2/
- Download mirror: https://naciscdn.org/naturalearth/50m/raster/NE2_50M_SR.zip
- Version: 3.2.0
- License: Natural Earth public domain data

Generation command:

```bash
mkdir -p data/natural-earth-raster src/assets
curl -L -f -o data/natural-earth-raster/NE2_50M_SR.zip https://naciscdn.org/naturalearth/50m/raster/NE2_50M_SR.zip
unzip -p data/natural-earth-raster/NE2_50M_SR.zip NE2_50M_SR/NE2_50M_SR.tif > data/natural-earth-raster/NE2_50M_SR.tif
sips -Z 2000 -s format jpeg -s formatOptions 82 data/natural-earth-raster/NE2_50M_SR.tif --out src/assets/natural-earth-2-50m.jpg
rm -rf data/natural-earth-raster
```
