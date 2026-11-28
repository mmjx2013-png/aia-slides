# Credits: photographs in style samples D and E

Every photograph below is in the public domain or released under CC0 (no rights reserved). The licence of each file was
checked on its Wikimedia Commons file page (structured licence data and the "Licensing" section). No attribution is
legally required for these files; we credit the source and licence on the slide anyway, and here in full.
Sample F (mechanics) uses no photographs: every engine, gear and lever drawing is our own SVG.
All wording on the slides is our own; nothing was copied from textbooks.

Files were resized, cropped and saved as WebP. "iNaturalist open data" means the same CC0 original, fetched from
iNaturalist's public open-data copy (`inaturalist-open-data.s3.amazonaws.com/photos/<id>/original.jpg`) because the
Commons file server was rate-limiting this build machine; the Commons page linked is where the licence was checked.

## D · Glass (`glass/img/`)

| File | Subject | Source page | Licence / credit |
|---|---|---|---|
| `bg-saturn.webp`, `bg-rings.webp`, `p-saturn.webp` | Saturn, Cassini, 6 Oct 2004 | https://commons.wikimedia.org/wiki/File:Saturn_from_Cassini_Orbiter_(2004-10-06).jpg | Public domain · NASA/JPL/Space Science Institute |
| `bg-sun.webp`, `p-sunlimb.webp` | The Sun at 304 Å, SDO/AIA, 19 Aug 2010 | https://commons.wikimedia.org/wiki/File:The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg | Public domain · NASA/SDO (AIA) |
| `bg-earth.webp`, `p-earth.webp` | Earth, Blue Marble, eastern hemisphere (Terra MODIS) | https://commons.wikimedia.org/wiki/File:Earth_Eastern_Hemisphere.jpg | Public domain · NASA |
| `p-mercury.webp` | Mercury, MESSENGER | https://commons.wikimedia.org/wiki/File:Mercury_in_true_color.jpg | Public domain · NASA/JHUAPL/Carnegie Institution of Washington |
| `p-venus.webp` | Venus | (our own drawing, a temporary stand-in; see the note below) | KruSlide |
| `p-mars.webp` | Mars, Viking 1 mosaic | https://commons.wikimedia.org/wiki/File:Mars_Valles_Marineris.jpeg | Public domain · NASA/USGS |
| `p-jupiter.webp` | Jupiter, Cassini | https://commons.wikimedia.org/wiki/File:Jupiter_by_Cassini-Huygens.jpg | Public domain · NASA/JPL/University of Arizona |
| `p-uranus.webp` | Uranus | (our own drawing, a temporary stand-in; see the note below) | KruSlide |
| `p-neptune.webp` | Neptune, Voyager 2 | https://commons.wikimedia.org/wiki/File:Neptune_Full.jpg | Public domain · NASA/JPL |
| `bg-stars.webp` | Star field | (our own drawing, generated with a short Python script; not a photograph) | KruSlide |

**Note on Venus and Uranus.** The Wikimedia file server kept refusing this build machine (HTTP 429 for over an hour), so
the two NASA photographs chosen for them could not be downloaded. Until they are swapped in, `p-venus.webp` and
`p-uranus.webp` are simple drawn discs, and slides 2, 3 and 5 say so in their captions. To finish: download
https://commons.wikimedia.org/wiki/File:Uranus2.jpg (public domain, NASA/JPL-Caltech, Voyager 2) and a public-domain
Venus photograph (for example https://commons.wikimedia.org/wiki/File:PIA23791-Venus-NewlyProcessedView-20200608.jpg,
"JPL Image Copyright": free use with the credit NASA/JPL-Caltech), crop each to its disc as a square WebP with a round
transparent edge (Venus 420 px, Uranus 600 px), save over the two files, remove the "ภาพวาด" wording from
`glass/src/parts/02-lens.html`, `03-stack.html` and `05-sun.html`, and run `python3 build.py`.

Planet sizes and distances on slide 2 and 3: NASA Planetary Fact Sheet (equatorial diameters; mean distance in AU).

## E · Photo-rich (`photo/img/`)

| File | Subject | Source page | Licence / credit |
|---|---|---|---|
| `e-stilt.webp` | Stilt mangrove (*Rhizophora*) in the sea, Thailand | https://commons.wikimedia.org/wiki/File:Indo-West_Pacific_Stilt_Mangrove_imported_from_iNaturalist_photo_249073146_on_27_February_2024.jpg (iNaturalist open data, photo 249073146) | CC0 |
| `e-stilt2.webp` | Stilt mangrove and its prop roots, Thailand | https://commons.wikimedia.org/wiki/File:Indo-West_Pacific_Stilt_Mangrove_imported_from_iNaturalist_photo_249073136_on_27_February_2024.jpg (iNaturalist open data, photo 249073136) | CC0 |
| `e-nipa.webp` | Nipa palm (*Nypa fruticans*), Thailand | https://commons.wikimedia.org/wiki/File:Nypa_fruticans_251538575.jpg (iNaturalist open data, photo 251538575) | CC0 |
| `e-nipa2.webp` | Nipa palm fruit, Thailand | https://commons.wikimedia.org/wiki/File:Nypa_fruticans_253985626.jpg (iNaturalist open data, photo 253985626) | CC0 |
| `e-snapper.webp` | Mangrove red snapper (*Lutjanus argentimaculatus*), Thailand | https://commons.wikimedia.org/wiki/Category:Lutjanus_argentimaculatus (iNaturalist open data, photo 261893694; Commons file "Lutjanus argentimaculatus 261893694.jpg") | CC0 |
| `e-snapper2.webp` | Mangrove red snapper in murky water, Thailand | https://commons.wikimedia.org/wiki/File:Lutjanus_argentimaculatus_257971200.jpg (iNaturalist open data, photo 257971200) | CC0 |
| `e-horseshoe.webp` | Mangrove horseshoe crab (*Carcinoscorpius rotundicauda*) | Commons file "Carcinoscorpius rotundicauda 279700632.jpg" (iNaturalist open data, photo 279700632) | CC0 |
| `e-avicennia.webp` | Grey mangrove (*Avicennia*) and its breathing roots, Rakhine, Myanmar | https://commons.wikimedia.org/wiki/File:Mangrove,_Rakhine,_Myanmar.jpg (iNaturalist open data, photo 252079119) | CC0 |
| `e-macaque.webp` | Long-tailed (crab-eating) macaques | https://commons.wikimedia.org/wiki/File:Long-tailed_Macaque_249911936.jpg (iNaturalist open data, photo 249911936) | CC0 |
