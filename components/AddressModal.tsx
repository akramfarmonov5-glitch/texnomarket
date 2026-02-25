import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { X, MapPin, Navigation, Loader2, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string) => void;
}

interface GeoSearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

const AddressModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(t.moveMap);
  const [canConfirm, setCanConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Details Form State
  const [details, setDetails] = useState({
    entrance: '',
    floor: '',
    apartment: '',
    comment: ''
  });

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    
    // Default center (Tashkent)
    const defaultCenter: [number, number] = [41.311081, 69.240562];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      mapInstanceRef.current = map;

      // Map Events
      map.on('movestart', () => {
        setIsDragging(true);
        setCanConfirm(false);
      });

      map.on('moveend', () => {
        setIsDragging(false);
        const center = map.getCenter();
        resolveAddress(center.lat, center.lng);
      });
      
      // Fix: Leaflet container size issue on modal open (Kulrang xarita muammosi)
      setTimeout(() => {
          map.invalidateSize();
      }, 200);

      // --- AUTO LOCATE ON OPEN ---
      handleLocateMe(undefined, true); // Silent auto-locate
      
      // Agar avto-lokatsiya ishlamasa, default markazni adresini olamiz
      resolveAddress(defaultCenter[0], defaultCenter[1]);

    } else {
        // Map mavjud bo'lsa, o'lchamini to'g'irlaymiz
        setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 200);
    }
  }, [isOpen]);

  const updateUserMarker = (lat: number, lng: number) => {
      if (!mapInstanceRef.current) return;

      const userIcon = L.divIcon({
          className: 'bg-transparent border-none',
          html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50 animate-ping"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-sm"></span>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
      });

      if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
      } else {
          userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current);
      }
  };

  const resolveAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
                'Accept-Language': 'uz-UZ,uz;q=0.9,en;q=0.8'
            }
        });
        
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();
        
        let formatted = t.moveMap;
        if (data.address) {
            const { road, pedestrian, house_number, amenity, shop, tourism, suburb, neighbourhood, city, town, county } = data.address;
            
            const place = amenity || shop || tourism;
            const street = road || pedestrian;
            const number = house_number;
            const district = suburb || neighbourhood;
            const cityVal = city || town || county;

            const parts = [];
            if (place) parts.push(place);
            const streetAddress = [street, number].filter(Boolean).join(', ');
            if (streetAddress) parts.push(streetAddress);
            else if (district) parts.push(district);
            
            if (parts.length === 0 && cityVal) parts.push(cityVal);
            
            formatted = parts.join(', ');
            if (!formatted) formatted = data.display_name.split(',')[0];
        }
        setCurrentAddress(formatted);
        setCanConfirm(true);
    } catch (e) {
        // FALLBACK: Agar API ishlamasa, koordinatalarni ko'rsatamiz.
        // Bu juda muhim, aks holda foydalanuvchi buyurtma bera olmay qoladi.
        console.warn("Geocoding failed, using coords:", e);
        setCurrentAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setCanConfirm(true);
    } finally {
        setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=uz&limit=5`, {
             headers: { 'Accept-Language': 'uz-UZ,uz;q=0.9,en;q=0.8' }
        });
        const data = await response.json();
        setSearchResults(data);
    } catch (e) {
        console.error("Search failed:", e);
    } finally {
        setIsSearching(false);
    }
  };

  const handleSelectResult = (result: GeoSearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lon], 18);
    }
    setSearchResults([]);
    setSearchQuery('');
    resolveAddress(lat, lon);
  };

  const handleConfirm = () => {
    const parts = [currentAddress];
    const { entrance, floor, apartment, comment } = details;
    
    const extras = [];
    if (entrance) extras.push(`${t.entrance}: ${entrance}`);
    if (floor) extras.push(`${t.floor}: ${floor}`);
    if (apartment) extras.push(`${t.apartment}: ${apartment}`);
    
    let finalAddress = parts.join('');
    if (extras.length > 0) finalAddress += ` (${extras.join(', ')})`;
    if (comment) finalAddress += `. Note: ${comment}`;

    onConfirm(finalAddress);
  };

  const handleLocateMe = (e?: React.MouseEvent, silent: boolean = false) => {
    e?.stopPropagation(); // Xarita bosilib ketmasligi uchun
    
    if (!navigator.geolocation) {
        if (!silent) alert("Sizning brauzeringiz geolokatsiyani qo'llab-quvvatlamaydi.");
        return;
    }
    
    if (!silent) setLoading(true);

    const success = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 18, {
                animate: true,
                duration: 1.5
            });
            updateUserMarker(latitude, longitude);
            resolveAddress(latitude, longitude);
        }
        setLoading(false);
    };

    const error = (err: GeolocationPositionError) => {
        console.warn("Geolocation error:", err);
        setLoading(false);
        if (!silent) {
            let msg = t.locationPermissionDenied;
            if (err.code === 1) msg = "Ruxsat berilmadi. Iltimos, qurilma sozlamalarida joylashuvni yoqing."; // Permission denied
            else if (err.code === 2) msg = "Joylashuv aniqlanmadi. GPS signalini tekshiring."; // Position unavailable
            else if (err.code === 3) msg = "Vaqt tugadi. Qaytadan urinib ko'ring."; // Timeout
            alert(msg);
        }
    };

    navigator.geolocation.getCurrentPosition(success, error, { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-slide-up">
        {/* Search Header */}
        <div className="absolute top-4 left-4 right-4 z-[60] flex gap-3 pointer-events-none">
            <button 
                onClick={onClose} 
                className="w-12 h-12 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-900 pointer-events-auto hover:bg-slate-50 transition-colors shrink-0"
            >
                <X size={24} />
            </button>
            
            <div className="flex-1 pointer-events-auto relative">
                <form onSubmit={handleSearch} className="w-full h-12 bg-white rounded-xl shadow-md flex items-center px-4 border border-slate-100 focus-within:ring-2 focus-within:ring-red-500">
                    <Search className="text-slate-400 mr-2" size={20} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t.searchAddress}
                        className="flex-1 h-full outline-none text-sm placeholder:text-slate-400"
                    />
                    {isSearching && <Loader2 className="animate-spin text-red-500" size={16} />}
                </form>

                {searchResults.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto z-[70] border border-slate-100">
                        {searchResults.map((result, idx) => (
                            <li key={idx}>
                                <button 
                                    onClick={() => handleSelectResult(result)}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 border-b border-slate-50 last:border-0 flex items-start gap-2"
                                >
                                    <MapPin size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                    <span className="line-clamp-2 text-slate-700">{result.display_name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Map */}
        <div className="flex-grow relative w-full">
            <div ref={mapContainerRef} className="w-full h-full bg-slate-200 z-0" id="map"></div>
            
            {/* Center Pin */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 z-[55] pointer-events-none flex flex-col items-center transition-all duration-300 ease-out ${isDragging ? '-translate-y-[calc(50%+10px)]' : '-translate-y-1/2'}`}>
                <MapPin size={48} className="text-red-600 fill-red-600 drop-shadow-2xl mb-1" />
                <div className={`w-3 h-1.5 bg-black/20 rounded-[100%] transition-all duration-300 ${isDragging ? 'scale-50 opacity-30 translate-y-2' : 'scale-100 opacity-100'}`}></div>
            </div>

            {/* Locate Me FAB */}
            <button 
                onClick={(e) => handleLocateMe(e, false)}
                className="absolute bottom-4 right-4 z-[55] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-red-600 active:scale-95 transition-transform hover:bg-slate-50 border border-slate-100"
                title="Mening joylashuvim"
                type="button"
            >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Navigation size={24} className="fill-current" />}
            </button>
        </div>

        {/* Bottom Sheet Form */}
        <div className="bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] -mt-6 z-[60] relative flex flex-col max-h-[50vh] overflow-y-auto">
            <div className="p-2 sticky top-0 bg-white z-10 flex justify-center">
                 <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="px-5 pb-5 space-y-4">
                {/* Main Address Input */}
                <div className="flex items-start space-x-3">
                    <MapPin className="text-red-600 mt-2.5 flex-shrink-0 animate-bounce" size={24} />
                    <div className="flex-grow">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.delivery}</label>
                        <textarea
                            value={currentAddress}
                            onChange={(e) => setCurrentAddress(e.target.value)}
                            className="w-full text-lg font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-red-600 outline-none resize-none py-1 leading-tight"
                            rows={2}
                        />
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t.entrance}</label>
                        <input 
                            type="text" 
                            className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold focus:border-red-500 outline-none"
                            value={details.entrance}
                            onChange={e => setDetails({...details, entrance: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t.floor}</label>
                        <input 
                            type="text" 
                            className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold focus:border-red-500 outline-none"
                            value={details.floor}
                            onChange={e => setDetails({...details, floor: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">{t.apartment}</label>
                        <input 
                            type="text" 
                            className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold focus:border-red-500 outline-none"
                            value={details.apartment}
                            onChange={e => setDetails({...details, apartment: e.target.value})}
                        />
                    </div>
                </div>

                {/* Comment */}
                <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase">{t.comment}</label>
                     <input 
                        type="text"
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-red-500 outline-none"
                        placeholder="..."
                        value={details.comment}
                        onChange={e => setDetails({...details, comment: e.target.value})}
                     />
                </div>

                {/* Confirm Button */}
                <button 
                    onClick={handleConfirm}
                    disabled={!canConfirm || loading}
                    className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-200 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:shadow-none hover:bg-red-700"
                >
                    {t.save}
                </button>
            </div>
        </div>
    </div>
  );
};

export default AddressModal;
