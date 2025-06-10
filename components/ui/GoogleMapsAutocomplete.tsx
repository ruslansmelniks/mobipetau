import React, { useRef, useState, useCallback, Suspense } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { Loader } from '@/components/ui/loader';

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

// Error boundary component
class GoogleMapsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded-md">
          <p className="text-red-600">Failed to load Google Maps. Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const GoogleMapsLoading = () => (
  <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-md">
    <Loader size="lg" />
    <span className="ml-2 text-gray-600">Loading map...</span>
  </div>
);

export const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({ value, onChange, onPlaceSelected, disabled }) => {
  const [mapCenter, setMapCenter] = useState(perthCenter);
  const [marker, setMarker] = useState<{ lat: number, lng: number } | null>(null);
  const [reverseGeocodeLoading, setReverseGeocodeLoading] = useState(false);
  const [reverseGeocodeError, setReverseGeocodeError] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
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
  }, [onChange, onPlaceSelected]);

  // Reverse geocode when marker is dragged
  const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
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
  }, [onChange, onPlaceSelected]);

  return (
    <GoogleMapsErrorBoundary>
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
          <Suspense fallback={<GoogleMapsLoading />}>
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
          </Suspense>
        </div>
        {reverseGeocodeLoading && (
          <div className="text-sm text-gray-500 mt-2">Looking up address for marker...</div>
        )}
        {reverseGeocodeError && (
          <div className="text-sm text-red-600 mt-2">{reverseGeocodeError}</div>
        )}
      </div>
    </GoogleMapsErrorBoundary>
  );
};

export default GoogleMapsAutocomplete; 