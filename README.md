# UrbanTwin - Quick Start Guide

## 🚀 Getting Started

### Development Mode (Fast Refresh)
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000)

### Production Build (Optimized Performance)
```bash
npm run build
npm start
```

## ✨ Features

### 🗺️ Interactive 3D Map
- Volumetric terrain with realistic elevation
- 3D buildings with dynamic lighting
- Traffic flow visualization
- Atmospheric effects (fog, sky, solar simulation)

### 🌦️ Real-Time Weather
- Live weather data from OpenWeatherMap
- Animated rain and snow particles
- Weather-based city analysis

### 🎤 Voice Control (V.O.I.S)
Click the microphone button and say:
- "Analyze" - Get AI city analysis
- "Orbit" / "Stop" - Control camera rotation
- "New York" / "London" / "Tokyo" / "Paris" / "Dubai" / "Singapore" - Fly to cities

### 🤖 AI-Powered Analysis
- Gemini AI provides city operation insights
- Weather impact analysis
- Traffic and safety recommendations

### ☀️ Solar Simulation
- Drag the time slider to change time of day
- Watch the sun move across the sky
- See atmospheric changes from dawn to dusk

## 🎯 Performance Features

### Adaptive Performance System
The app automatically detects your device and optimizes:

- **High-End Devices**: Full quality, all features enabled
- **Medium Devices**: Balanced performance and quality
- **Low-End Devices**: Optimized mode for smooth 45+ FPS

### Optimizations Applied
- ✅ Dynamic component loading
- ✅ Intelligent caching (weather, geocoding)
- ✅ Frame rate limiting
- ✅ Debounced updates
- ✅ Memoized components
- ✅ Code splitting
- ✅ Asset compression

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:

```env
# Required
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Optional (app works with mock data if not provided)
WEATHER_API_KEY=your_openweathermap_key
GEMINI_API_KEY=your_google_gemini_key
```

### Get API Keys
1. **Mapbox** (Required): https://account.mapbox.com/
2. **OpenWeatherMap** (Optional): https://openweathermap.org/api
3. **Google Gemini** (Optional): https://makersuite.google.com/app/apikey

## 📊 Performance Monitoring

### Chrome DevTools
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with the app
5. Stop recording
6. Check:
   - FPS (should be 60)
   - Main thread activity
   - Memory usage

### Expected Metrics
- **Initial Load**: ~1.5s
- **Time to Interactive**: ~2.0s
- **FPS**: 60 (high-end), 45+ (low-end)
- **Bundle Size**: ~500KB (gzipped)

## 🎨 Tech Stack

- **Framework**: Next.js 16 (with Turbopack)
- **Mapping**: Mapbox GL JS
- **AI**: Google Gemini 2.0 Flash
- **UI**: Radix UI + Tailwind CSS
- **Language**: TypeScript
- **Voice**: Web Speech API

## 📝 Project Structure

```
urban-twin/
├── src/
│   ├── app/
│   │   ├── actions.ts          # Server actions (weather, AI, geocoding)
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page (optimized)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── Maps.tsx            # 3D map component (optimized)
│   │   ├── ControlPanel.tsx    # UI controls
│   │   ├── WeatherOverlay.tsx  # Weather particles (optimized)
│   │   └── ui/                 # Reusable UI components
│   └── hooks/
│       └── useVoiceCommand.ts  # Voice control hook
├── next.config.ts              # Next.js config (Turbopack optimized)
├── PERFORMANCE_OPTIMIZATION.md # Detailed optimization docs
└── README.md                   # This file
```

## 🐛 Troubleshooting

### Build Issues
If you encounter build errors:
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Voice Control Not Working
- Voice control requires Chrome/Edge browser
- Click the microphone button to activate
- Allow microphone permissions when prompted

### Map Not Loading
- Check that `NEXT_PUBLIC_MAPBOX_TOKEN` is set in `.env.local`
- Verify the token is valid at https://account.mapbox.com/

## 🎉 Enjoy!

Your UrbanTwin app is now optimized for blazing-fast performance while maintaining premium quality and all features!

For detailed performance metrics and optimization details, see [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)
