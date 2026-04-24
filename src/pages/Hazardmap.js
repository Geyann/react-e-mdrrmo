import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const styles = {
  container: { height: '79%', width: '99vw', position: 'relative', top: -60, zIndex: 0 },
  homeBtn: {
    position: 'absolute', top: '20px', left: '20px', zIndex: 1000,
    backgroundColor: 'white', padding: '10px', borderRadius: '4px', cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
  },
  controls: { position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 },
  layerMenu: {
    backgroundColor: '#D9D9D9', width: '300px', borderRadius: '4px 4px 0 0',
    marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  },
  menuItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '15px 20px', borderBottom: '1px solid #bcbcbc', color: '#555', fontWeight: 'bold'
  },
  eyeIcon: { cursor: 'pointer', padding: '8px', backgroundColor: '#999', borderRadius: '2px' },
  btnRow: { display: 'flex', gap: '10px' },
  iconBtn: {
    backgroundColor: 'white', padding: '12px', borderRadius: '4px',
    cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }
};

const MapPrototype = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [mapType, setMapType] = useState('satellite');
  const [showBoundary, setShowBoundary] = useState(false);

  const satelliteUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div style={styles.container}>
      <div style={styles.homeBtn}>
        <img src="https://img.icons8.com/material-rounded/24/000000/home.png" alt="home" />
      </div>

      <MapContainer center={[14.32, 120.81]} zoom={13} style={{ height: '100%' }} zoomControl={false}>
        <TileLayer url={mapType === 'satellite' ? satelliteUrl : streetUrl} />
        {showBoundary && <Polygon positions={[[14.34, 120.8042], [ 14.32, 120.8190],[ 14.25, 120.79], [ 14.29, 120.70], [ 14.34, 120.74]]} color="red" />}
      </MapContainer> 

      <div style={styles.controls}>
        {showMenu && (
          <div style={styles.layerMenu}>
            <div style={styles.menuItem}>
              <span>Municipal Boundary</span>
              <div style={styles.eyeIcon} onClick={() => setShowBoundary(!showBoundary)}>
                <img src="https://img.icons8.com/material-rounded/20/ffffff/visible.png" alt="eye" />
              </div>
            </div>
            <div style={styles.menuItem}>
              <span>Flood In</span>
              <div style={styles.eyeIcon}><img src="https://img.icons8.com/material-rounded/20/ffffff/visible.png" alt="eye" /></div>
            </div>
          </div>
        )}

        <div style={styles.btnRow}>
          <div style={styles.iconBtn} onClick={() => setShowMenu(!showMenu)}>
            <img src="https://img.icons8.com/material-outlined/24/000000/layers.png" alt="layers" />
          </div>

          {/* UPDATED BUTTON: Now features a Map Icon */}
          <div style={styles.iconBtn} onClick={() => setMapType(mapType === 'satellite' ? 'street' : 'satellite')}>
            <img
              src="https://img.icons8.com/material-outlined/24/000000/map.png"
              alt="toggle map type"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPrototype;