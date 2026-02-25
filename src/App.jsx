import { useState, useCallback } from "react";

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m) {
    return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function ToiletCard({ toilet, index, distance }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
            style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                animationDelay: `${index * 80}ms`,
            }}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-center gap-4 p-4">
                <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg"
                    style={{
                        background: index === 0 ? "linear-gradient(135deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.1)",
                        color: index === 0 ? "#1a1a1a" : "rgba(255,255,255,0.7)",
                    }}
                >
                    {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate" style={{ fontFamily: "'Bebas Neue', cursive", letterSpacing: "0.05em", fontSize: "1.05rem" }}>
                        {toilet.name}
                    </p>
                    <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace" }}>
                        {toilet.address}
                    </p>
                </div>

                <div className="flex-shrink-0 text-right">
                    <p className="font-black text-xl" style={{ color: "#00FFB3", fontFamily: "'Bebas Neue', cursive" }}>
                        {formatDistance(distance)}
                    </p>
                </div>
            </div>

            {expanded && (
                <div
                    className="px-4 pb-4 flex flex-wrap gap-2"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <div className="pt-3 flex flex-wrap gap-2 w-full">
                        <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                                background: toilet.open24h ? "rgba(0,255,179,0.15)" : "rgba(255,255,255,0.08)",
                                color: toilet.open24h ? "#00FFB3" : "rgba(255,255,255,0.4)",
                                fontFamily: "'DM Mono', monospace",
                                border: `1px solid ${toilet.open24h ? "rgba(0,255,179,0.3)" : "rgba(255,255,255,0.1)"}`,
                            }}
                        >
                            {toilet.open24h ? "24 HOURS" : "LIMITED HRS"}
                        </span>
                        <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                                background: toilet.accessible ? "rgba(0,179,255,0.15)" : "rgba(255,255,255,0.08)",
                                color: toilet.accessible ? "#00B3FF" : "rgba(255,255,255,0.4)",
                                fontFamily: "'DM Mono', monospace",
                                border: `1px solid ${toilet.accessible ? "rgba(0,179,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                            }}
                        >
                            {toilet.accessible ? "ACCESSIBLE" : "NOT ACCESSIBLE"}
                        </span>
                        <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                                background: toilet.fee ? "rgba(255,180,0,0.15)" : "rgba(0,255,179,0.1)",
                                color: toilet.fee ? "#FFB400" : "#00FFB3",
                                fontFamily: "'DM Mono', monospace",
                                border: `1px solid ${toilet.fee ? "rgba(255,180,0,0.3)" : "rgba(0,255,179,0.2)"}`,
                            }}
                        >
                            {toilet.fee ? "PAID" : "FREE"}
                        </span>
                    </div>
                    <button
                        className="w-full mt-2 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                        style={{
                            background: "linear-gradient(135deg, #00FFB3, #00B3FF)",
                            color: "#0a0f1e",
                            fontFamily: "'Bebas Neue', cursive",
                            letterSpacing: "0.1em",
                            fontSize: "0.95rem",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                                `https://www.google.com/maps?q=${toilet.lat},${toilet.lng}`,
                                "_blank"
                            );
                        }}
                    >
                        OPEN IN MAPS
                    </button>
                </div>
            )}
        </div>
    );
}

export default function App() {
    const [phase, setPhase] = useState("idle");
    const [coords, setCoords] = useState(null);
    const [nearest, setNearest] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [pulse, setPulse] = useState(false);

    const handlePanic = useCallback(() => {
        if (phase === "locating") return;
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        setPhase("locating");
        setErrorMsg("");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setCoords({ lat: latitude, lng: longitude });

                try {
                    const query = `
                     [out:json][timeout:10];
                     node["amenity"="toilets"](around:100000,${latitude},${longitude});
                     out body;
                    `;

                    const res = await fetch("https://overpass-api.de/api/interpreter", {
                        method: "POST",
                        body: query,
                    });
                    const data = await res.json();
                    console.log(data);

                    const sorted = data.elements
                        .filter((t) => t.lat && t.lon)
                        .map((t) => ({
                            id: t.id,
                            name: t.tags?.name ?? "Public Toilet",
                            lat: t.lat,
                            lng: t.lon,
                            address: t.tags?.["addr:street"]
                                ? `${t.tags["addr:housenumber"] ?? ""} ${t.tags["addr:street"]}`.trim()
                                : "No address listed",
                            accessible: t.tags?.wheelchair === "yes",
                            open24h: t.tags?.opening_hours === "24/7",
                            fee: t.tags?.fee === "yes",
                            distance: getDistance(latitude, longitude, t.lat, t.lon),
                        }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 5);

                    setNearest(sorted);
                    setPhase("found");
                } catch (err) {
                    setErrorMsg("Couldn't load toilet data. Check your connection and try again.");
                    setPhase("error");
                }
            },
            () => {
                setErrorMsg("Location access denied — please allow location in your browser settings.");
                setPhase("error");
            },
            { timeout: 8000, maximumAge: 30000 }
        );
    }, [phase]);

    const handleReset = () => {
        setPhase("idle");
        setNearest([]);
        setCoords(null);
        setErrorMsg("");
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #060c1a; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes panicPulse {
          0% { transform: scale(1); }
          30% { transform: scale(0.93); }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .panic-btn {
          animation: none;
          transition: box-shadow 0.2s;
        }
        .panic-btn:hover {
          box-shadow: 0 0 60px rgba(255, 60, 60, 0.6), 0 0 120px rgba(255, 60, 60, 0.2);
        }
        .panic-btn:active { transform: scale(0.96); }
        .panic-pulse { animation: panicPulse 0.6s ease-out; }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(255,60,60,0.5);
          animation: ringPulse 1.4s ease-out infinite;
        }

        .card-animate {
          animation: cardIn 0.4s ease-out both;
        }

        .locating-spin {
          width: 60px; height: 60px;
          border: 4px solid rgba(255,255,255,0.1);
          border-top-color: #00FFB3;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .bg-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}</style>

            <div
                className="min-h-screen bg-grid flex flex-col items-center"
                style={{
                    background: "radial-gradient(ellipse at 50% 0%, #0f1f3d 0%, #060c1a 70%)",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "white",
                }}
            >
                {/* Header */}
                <div className="w-full max-w-md px-5 pt-10 pb-4">
                    <p
                        className="text-center uppercase tracking-widest text-xs mb-1"
                        style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}
                    >
                        Emergency Locator
                    </p>
                    <h1
                        className="text-center text-5xl"
                        style={{
                            fontFamily: "'Bebas Neue', cursive",
                            letterSpacing: "0.08em",
                            background: "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.5))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        NEAREST LOO
                    </h1>
                </div>

                {/* Main content area */}
                <div className="w-full max-w-md px-5 flex-1 flex flex-col items-center">

                    {/* IDLE */}
                    {phase === "idle" && (
                        <div className="flex flex-col items-center justify-center gap-8 flex-1 w-full">
                            <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
                                <div className="ring" style={{ width: 220, height: 220, animationDelay: "0s", pointerEvents: "none" }} />
                                <div className="ring" style={{ width: 200, height: 200, animationDelay: "0.5s", pointerEvents: "none" }} />

                                <button
                                    onClick={handlePanic}
                                    className={`panic-btn relative z-10 rounded-full flex flex-col items-center justify-center select-none ${pulse ? "panic-pulse" : ""}`}
                                    style={{
                                        width: 200,
                                        height: 200,
                                        background: "radial-gradient(circle at 35% 35%, #ff6b6b, #cc0000 60%, #8b0000)",
                                        boxShadow: "0 0 40px rgba(255,60,60,0.4), 0 0 80px rgba(255,60,60,0.15), inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -4px 0 rgba(0,0,0,0.3)",
                                        border: "3px solid rgba(255,100,100,0.4)",
                                    }}
                                >
                                    <span style={{ fontSize: 52, lineHeight: 1 }}>🚨</span>
                                    <span
                                        className="mt-2 text-white font-black tracking-widest"
                                        style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "1.6rem", letterSpacing: "0.12em" }}
                                    >
                                        PANIC
                                    </span>
                                    <span
                                        className="text-xs mt-1 tracking-wider"
                                        style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace" }}
                                    >
                                        FIND NEAREST LOO
                                    </span>
                                </button>
                            </div>

                            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                                Uses your location to find the<br />5 closest public toilets
                            </p>
                        </div>
                    )}

                    {/* LOCATING */}
                    {phase === "locating" && (
                        <div className="flex flex-col items-center gap-6 mt-16" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
                            <div className="locating-spin" />
                            <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "1.5rem", letterSpacing: "0.1em", color: "#00FFB3" }}>
                                LOCATING...
                            </p>
                            <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>
                                Getting your coordinates.<br />Please allow location access.
                            </p>
                        </div>
                    )}

                    {/* ERROR */}
                    {phase === "error" && (
                        <div className="flex flex-col items-center justify-center gap-6 flex-1 w-full" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
                            <div
                                className="w-full px-4 py-4 rounded-xl text-sm text-center"
                                style={{
                                    background: "rgba(255,60,60,0.1)",
                                    border: "1px solid rgba(255,60,60,0.25)",
                                    color: "#ff6b6b",
                                    fontFamily: "'DM Mono', monospace",
                                }}
                            >
                                {errorMsg}
                            </div>
                            <button
                                onClick={handleReset}
                                className="px-6 py-3 rounded-xl font-bold transition-opacity hover:opacity-80"
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: "white",
                                    fontFamily: "'Bebas Neue', cursive",
                                    letterSpacing: "0.1em",
                                    fontSize: "1rem",
                                }}
                            >
                                TRY AGAIN
                            </button>
                        </div>
                    )}

                    {/* FOUND */}
                    {phase === "found" && (
                        <div className="w-full mt-4" style={{ animation: "fadeSlideUp 0.4s ease-out" }}>
                            {coords && (
                                <div
                                    className="mb-4 px-4 py-2 rounded-xl text-xs flex justify-between"
                                    style={{
                                        background: "rgba(0,255,179,0.06)",
                                        border: "1px solid rgba(0,255,179,0.15)",
                                        color: "rgba(0,255,179,0.7)",
                                        fontFamily: "'DM Mono', monospace",
                                    }}
                                >
                                    <span>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
                                    <span style={{ color: "rgba(255,255,255,0.3)" }}>YOUR LOCATION</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-3">
                                <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "1.3rem", letterSpacing: "0.08em", color: "rgba(255,255,255,0.8)" }}>
                                    5 NEAREST TOILETS
                                </h2>
                                <button
                                    onClick={handleReset}
                                    className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                                    style={{
                                        background: "rgba(255,255,255,0.07)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        color: "rgba(255,255,255,0.5)",
                                        fontFamily: "'DM Mono', monospace",
                                    }}
                                >
                                    RESET
                                </button>
                            </div>

                            {nearest.length === 0 ? (
                                <div
                                    className="text-center py-8 text-sm"
                                    style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}
                                >
                                    No toilets found nearby.<br />Try again in a different location.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 pb-10">
                                    {nearest.map((toilet, i) => (
                                        <div key={toilet.id} className="card-animate" style={{ animationDelay: `${i * 80}ms` }}>
                                            <ToiletCard toilet={toilet} index={i} distance={toilet.distance} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {/* Footer */}
                <div className="py-6 text-center px-5 max-w-md mx-auto">
                    <p
                        className="text-xs mb-2"
                        style={{ color: "rgba(255,255,255,0.15)", fontFamily: "'DM Mono', monospace" }}
                    >
                        POWERED BY OPENSTREETMAP
                    </p>
                    <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", lineHeight: "1.6" }}
                    >
                        This app uses your location to find nearby public toilets.
                        Your location is not stored, tracked, or shared with us.
                    </p>
                </div>
                ```