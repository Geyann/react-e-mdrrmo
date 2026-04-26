import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Accurate GeoJSON coordinates for Naic (simplified for example)
// MUST BE ARRANGED IN A CLOCKWISE OR COUNTER-CLOCKWISE ORDER
const naicBoundary = [
    [14.3725, 120.7242], // North/West corner (coastal)
    [14.3853, 120.7937], // North/East corner
    [14.3210, 120.8524], // East
    [14.2384, 120.7674], // South
    [14.2884, 120.6961], // West
    [14.3533, 120.6698], // North/West
    [14.3725, 120.7242]  // Close the loop
];

// The "Mask": A rectangle covering the entire globe
const outerWorld = [
    [-90, -180], // South-West
    [-90, 180],  // South-East
    [90, 180],   // North-East
    [90, -180]   // North-West
];

const NaicFloatingMap = () => {
    const center = [14.3168, 120.7634]; // Centered over Naic

    // By passing an array containing two polygons, 
    // Leaflet treats the second (naicBoundary) as a cutout/hole.
    const maskCoordinates = [outerWorld, naicBoundary];

    return (
        // The background color of this container will fill the hidden area.
        <div style={{ height: '100vh', width: '100vw', backgroundColor: '#fdfdfd' }}>
            <MapContainer 
                center={center} 
                zoom={13} 
                scrollWheelZoom={true} 
                zoomControl={false} // Cleaner look like the image
                style={{ height: '100%', width: '100%' }}
                // IMPORTANT: Strictly limit navigation so the mask is never visible
                maxBounds={[[14.2300, 120.6600], [14.3900, 120.8600]]}
                maxBoundsViscosity={1.0} // Hard boundaries
            >
                {/* The detailed map visible ONLY inside Naic */}
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* THE MASK: Completely solid fill that covers everything */}
                <Polygon 
                    positions={maskCoordinates} 
                    pathOptions={{
                        color: 'black',        // Border color of the boundary (dashed in your image)
                        weight: 2,
                        dashArray: '5, 10',     // Dashed line pattern
                        fillColor: '#fdfdfd',   // Mask color (must match container background)
                        fillOpacity: 1         // 100% solid, hides everything underneath
                    }} 
                />
            </MapContainer>
        </div>
    );
};

export default NaicFloatingMap;