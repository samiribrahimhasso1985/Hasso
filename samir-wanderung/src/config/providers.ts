/**
 * Central provider registry. Every external data source used by SSBN
 * is declared here with its attribution and caching/offline policy so the UI
 * and the offline engine can respect licences.
 */
export interface Provider {
  id: string;
  name: string;
  attribution: string;
  licenseUrl: string;
  /** Whether bulk download for offline use is permitted by the provider's policy. */
  offlineAllowed: boolean;
  note?: string;
}

export const PROVIDERS: Record<string, Provider> = {
  openfreemap: {
    id: 'openfreemap',
    name: 'OpenFreeMap (OpenMapTiles schema)',
    attribution: '© OpenFreeMap © OpenMapTiles Data from © OpenStreetMap contributors',
    licenseUrl: 'https://openfreemap.org/',
    offlineAllowed: true,
    note: 'Free public instance without API key. Offline downloads are capped per region to stay considerate.',
  },
  osmTiles: {
    id: 'osmTiles',
    name: 'OpenStreetMap standard tiles',
    attribution: '© OpenStreetMap contributors',
    licenseUrl: 'https://operations.osmfoundation.org/policies/tiles/',
    offlineAllowed: false,
    note: 'The OSMF tile usage policy forbids bulk downloading (prefetching) for offline use.',
  },
  esriImagery: {
    id: 'esriImagery',
    name: 'Esri World Imagery',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    licenseUrl: 'https://www.esri.com/en-us/legal/terms/full-master-agreement',
    offlineAllowed: false,
    note: 'Satellite imagery is display-only here; offline caching is not permitted without an Esri agreement.',
  },
  terrarium: {
    id: 'terrarium',
    name: 'Terrain Tiles on AWS (Mapzen Terrarium)',
    attribution: 'Elevation: Terrain Tiles (Mapzen/Tilezen), sources incl. SRTM, GMTED, ETOPO1, USGS NED',
    licenseUrl: 'https://registry.opendata.aws/terrain-tiles/',
    offlineAllowed: true,
  },
  valhalla: {
    id: 'valhalla',
    name: 'Valhalla (FOSSGIS public server)',
    attribution: 'Routing © Valhalla / FOSSGIS e.V., data © OpenStreetMap contributors',
    licenseUrl: 'https://github.com/valhalla/valhalla',
    offlineAllowed: false,
    note: 'Public demo server with fair-use limits. Configure VALHALLA_URL for a self-hosted instance in production.',
  },
  nominatim: {
    id: 'nominatim',
    name: 'Nominatim',
    attribution: 'Geocoding © OpenStreetMap contributors (ODbL) via Nominatim',
    licenseUrl: 'https://operations.osmfoundation.org/policies/nominatim/',
    offlineAllowed: false,
    note: 'Max 1 request/second, results cached on the server.',
  },
  openmeteo: {
    id: 'openmeteo',
    name: 'Open-Meteo',
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    licenseUrl: 'https://open-meteo.com/en/license',
    offlineAllowed: false,
  },
  wikidata: {
    id: 'wikidata',
    name: 'Wikidata',
    attribution: 'Destination data from Wikidata (CC0)',
    licenseUrl: 'https://www.wikidata.org/wiki/Wikidata:Licensing',
    offlineAllowed: true,
  },
  overpass: {
    id: 'overpass',
    name: 'Overpass API',
    attribution: 'Trail data © OpenStreetMap contributors via Overpass API',
    licenseUrl: 'https://www.openstreetmap.org/copyright',
    offlineAllowed: false,
  },
};

export const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
export const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const CESIUM_ION_TOKEN: string | undefined = import.meta.env.VITE_CESIUM_ION_TOKEN || undefined;
