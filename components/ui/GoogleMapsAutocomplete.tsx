import React, { useRef, useState, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const perthCenter = { lat: -31.9505, lng: 115.8605 };
const perthBounds = {
  north: -31.6245,
  south: -32.3569,
  east: 116.2390,
  west: 115.6841,
};

interface GoogleMapsAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (place: google.maps.places.PlaceResult, latLng: { lat: number, lng: number }) => void;
  disabled?: boolean;
}

export const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({ value, onChange, onPlaceSelected, disabled }) => {
  const [mapCenter, setMapCenter] = useState(perthCenter);
  const [marker, setMarker] = useState<{ lat: number, lng: number } | null>(null);
  const [reverseGeocodeLoading, setReverseGeocodeLoading] = useState(false);
  const [reverseGeocodeError, setReverseGeocodeError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMapCenter({ lat, lng });
        setMarker({ lat, lng });
        if (onPlaceSelected) onPlaceSelected(place, { lat, lng });
      }
      if (place.formatted_address) {
        onChange(place.formatted_address);
      }
    }
  };

  // Reverse geocode when marker is dragged
  const handleMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMapCenter({ lat, lng });
    setMarker({ lat, lng });
    setReverseGeocodeLoading(true);
    setReverseGeocodeError(null);
    try {
      if (!geocoderRef.current && window.google && window.google.maps) {
        geocoderRef.current = new window.google.maps.Geocoder();
      }
      if (geocoderRef.current) {
        geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
          setReverseGeocodeLoading(false);
          if (status === 'OK' && results && results[0]) {
            onChange(results[0].formatted_address);
            if (onPlaceSelected) onPlaceSelected(results[0] as any, { lat, lng });
          } else {
            setReverseGeocodeError('Could not determine address for this location.');
          }
        });
      } else {
        setReverseGeocodeLoading(false);
        setReverseGeocodeError('Geocoder not available.');
      }
    } catch (err) {
      setReverseGeocodeLoading(false);
      setReverseGeocodeError('Reverse geocoding failed.');
    }
  };

  if (loadError) return <div>Failed to load Google Maps</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          bounds: new window.google.maps.LatLngBounds(
            { lat: perthBounds.south, lng: perthBounds.west },
            { lat: perthBounds.north, lng: perthBounds.east }
          ),
          strictBounds: true,
          componentRestrictions: { country: 'au' },
        }}
      >
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          placeholder="Enter your address"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
        />
      </Autocomplete>
      <div className="mt-4 rounded overflow-hidden" style={{ height: 300 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={marker || perthCenter}
          zoom={marker ? 16 : 11}
          options={{
            restriction: {
              latLngBounds: perthBounds,
              strictBounds: false,
            },
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {marker && (
            <Marker
              position={marker}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
      {reverseGeocodeLoading && (
        <div className="text-sm text-gray-500 mt-2">Looking up address for marker...</div>
      )}
      {reverseGeocodeError && (
        <div className="text-sm text-red-600 mt-2">{reverseGeocodeError}</div>
      )}
    </div>
  );
};

export default GoogleMapsAutocomplete; 