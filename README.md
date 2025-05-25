# 🌍 3D Globe Flight Tracker

A interactive 3D globe application built with Three.js that allows you to visualize flight paths between any two points on Earth with realistic airplane animations.

## ✨ Features

### 🛩️ Flight Path Visualization
- **Interactive Pin Placement**: Click or tap anywhere on the globe to place departure and destination pins
- **Great Circle Routes**: Automatically calculates and displays the shortest flight path between two points
- **Realistic Airplane Animation**: 3D airplane model flies along the route with proper orientation and banking
- **Continuous Flight Loop**: Airplane flies back and forth between destinations without interruption

### 🌍 Realistic Earth Visualization
- **High-Resolution Earth Texture**: Real satellite imagery from NASA and other reliable sources
- **Atmospheric Glow**: Subtle blue atmosphere effect around Earth
- **Day/Night Lighting**: Realistic directional lighting showing illuminated and shadowed regions

### ☀️ Solar System Context
- **Animated Sun**: Bright, glowing sun with corona effects and pulsing animation
- **Realistic Lighting**: Sun position determines Earth's illumination
- **Solar Corona**: Rotating wireframe effect simulating solar magnetic field

### 🎮 Intuitive Controls
- **Mouse Controls**: 
  - Left click and drag to rotate the globe
  - Scroll wheel to zoom in/out
  - Click to place pins
- **Touch Controls**: 
  - Single finger drag to rotate
  - Pinch to zoom
  - Tap to place pins
- **Optimized Sensitivity**: Smooth, precise control with reduced zoom sensitivity

### 🌌 Immersive Environment
- **Starfield Background**: 10,000 stars create a realistic space environment
- **Smooth Animations**: 60fps animations using requestAnimationFrame
- **Auto-Rotation**: Optional globe rotation (can be paused/resumed)

### 📱 Mobile-Friendly Interface
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Collapsible Menu**: Clean hamburger menu for mobile devices
- **Touch Optimized**: All interactions work smoothly on touch devices
- **Glassmorphism UI**: Modern, translucent interface design

## 🚀 Quick Start

1. **Clone or Download** the project files
2. **Serve the files** using any web server:
   ```bash
   # Using Node.js (if you have npm installed)
   npm start
   
   # Or using Python
   python -m http.server 8000
   
   # Or using any other local server
   ```
3. **Open your browser** and navigate to the server address
4. **Start exploring!** Click anywhere on the globe to place pins and watch flights

## 🎯 How to Use

### Placing Flight Pins
1. **First Pin (Red)**: Click anywhere on the globe to set your departure point
2. **Second Pin (Green)**: Click another location to set your destination
3. **Flight Path**: A curved arc will automatically appear connecting the two points
4. **Airplane Animation**: A 3D airplane will start flying along the route

### Controls
- **Rotate Globe**: Click and drag (mouse) or swipe (touch)
- **Zoom**: Mouse wheel or pinch gesture
- **Clear Pins**: Use the "Clear Pins" button in the control panel
- **Pause Rotation**: Toggle the auto-rotation on/off

### Mobile Usage
- **Menu Access**: Tap the hamburger menu (☰) to access controls
- **Pin Placement**: Single tap to place pins
- **Navigation**: Single finger to rotate, two fingers to zoom

## 🛠️ Technical Details

### Built With
- **Three.js r149**: 3D graphics and WebGL rendering
- **Vanilla JavaScript**: No additional frameworks required
- **CSS3**: Modern styling with glassmorphism effects
- **HTML5**: Semantic markup and responsive design

### Key Components
- **Globe Rendering**: High-resolution sphere with real Earth textures
- **Flight Path Calculation**: Great circle arc mathematics for realistic routes
- **Airplane Model**: Detailed 3D aircraft with fuselage, wings, engines, and livery
- **Animation System**: Smooth interpolation and orientation along flight paths
- **Lighting System**: Realistic sun positioning and atmospheric effects

### Performance Optimizations
- **Efficient Rendering**: Optimized geometry and materials
- **Texture Loading**: Progressive loading with fallbacks
- **Animation**: RequestAnimationFrame for smooth 60fps performance
- **Memory Management**: Proper cleanup of animations and objects

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **WebGL Support**: Requires WebGL-enabled browser
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet

## 🎨 Customization

### Airplane Speed
Adjust the flight speed by modifying the `speed` variable in the `createPathAnimation` function:
```javascript
const speed = 0.32; // Lower = slower, Higher = faster
```

### Earth Texture
Replace texture URLs in the `earthTextureSources` array to use different Earth imagery:
```javascript
const earthTextureSources = [
    'your-custom-earth-texture.jpg',
    // ... other sources
];
```

### Sun Position
Modify sun location by changing the directional light position:
```javascript
directionalLight.position.set(x, y, z); // Adjust coordinates
```

### Colors and Materials
Customize airplane colors, pin colors, or UI colors by modifying the respective material properties in the code.

## 📁 Project Structure

```
routemap/
├── index.html          # Main HTML file
├── styles.css          # Styling and responsive design
├── globe.js            # Main application logic
├── package.json        # Dependencies and scripts
└── README.md          # This documentation
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# The application will be available at http://localhost:3000
```

### Adding Features
The codebase is modular and well-commented. Key areas for extension:
- **Aircraft Models**: Add different airplane types in `createAirplane()`
- **Earth Textures**: Add seasonal or weather overlays
- **Flight Data**: Integrate real flight tracking APIs
- **UI Enhancements**: Add more control options or information displays

## 🌟 Features in Detail

### Realistic Flight Physics
- **Great Circle Routes**: Uses spherical geometry for accurate flight paths
- **Proper Banking**: Airplane naturally banks into turns
- **Altitude Simulation**: Flight paths arc above Earth's surface
- **Continuous Motion**: Smooth interpolation between path points

### Visual Effects
- **Multi-layer Sun**: Core, inner glow, outer glow, and corona effects
- **Earth Atmosphere**: Subtle blue glow around the planet
- **Starfield**: Randomly distributed stars for space context
- **Material Lighting**: Realistic Phong shading and shadows

### User Experience
- **Instant Feedback**: Immediate visual response to all interactions
- **Error Handling**: Graceful fallbacks for loading failures
- **Progressive Enhancement**: Works with or without advanced features
- **Accessibility**: Keyboard navigation and screen reader friendly

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs or suggest features
- Submit pull requests
- Improve documentation
- Share your customizations

## 🙏 Acknowledgments

- **Three.js Community**: For the amazing 3D graphics library
- **NASA**: For providing high-quality Earth imagery
- **WebGL Earth Project**: For additional texture resources
- **Open Source Community**: For inspiration and resources

---
