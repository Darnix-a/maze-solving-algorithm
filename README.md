# 🌊 Novel Maze Pathfinding Algorithm

A sophisticated React-based visualization and comparison tool for a novel gradient field pathfinding algorithm with physics-inspired mechanics and guaranteed completeness fallback.

![Novel Maze Pathfinding](https://img.shields.io/badge/Status-Complete-green)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.13-cyan)

## 🎯 Overview

This project implements and visualizes a **novel pathfinding algorithm** that combines:
- **Gradient Field Pathfinding**: Physics-inspired approach using potential fields and momentum
- **Completeness Fallback**: Deterministic algorithm ensuring optimal solutions
- **Interactive Visualization**: Real-time step-by-step algorithm execution
- **Performance Benchmarking**: Side-by-side comparison with classic BFS

### 🌟 Key Features

- **🧠 Novel Algorithm**: Gradient field pathfinding with momentum and repulsive forces
- **🎮 Interactive UI**: Click-and-drag maze editing, real-time parameter tuning  
- **📊 Algorithm Comparison**: Side-by-side visualization against BFS baseline
- **🎨 Advanced Visualization**: Layered canvas rendering with gradient field heatmaps
- **⚡ Real-time Controls**: Step-by-step execution, animation speed control
- **📈 Performance Metrics**: Execution time, path quality, exploration efficiency

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/novel-maze-solver.git
   cd novel-maze-solver
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Build for Production
```bash
npm run build
npm run preview
```

## 🧪 Algorithm Details

### Novel Gradient Field Pathfinding

Our novel algorithm uses a **physics-inspired approach** that treats pathfinding as particle navigation through a potential field:

#### Core Concepts

1. **Potential Field Construction**
   - Creates attractive potential radiating from the goal
   - Uses BFS-like wavefront expansion for preprocessing
   - Adds Gaussian repulsive potentials around obstacles

2. **Gradient Descent with Momentum**
   - Performs gradient descent from start position
   - Incorporates momentum for smooth, natural movement
   - Includes cycle detection and escape mechanisms

3. **Completeness Guarantee**
   - Falls back to deterministic iterative deepening search
   - Explores cells in Manhattan distance rings
   - Guarantees finding optimal path if one exists

#### Algorithm Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|--------|
| `momentumFactor` | Momentum persistence (0=none, 0.9=high) | 0.7 | 0.0-0.95 |
| `repulsionSigma` | Gaussian wall repulsion spread | 1.5 | 0.5-3.0 |
| `repulsionStrength` | Wall repulsion force strength | 10.0 | 1.0-20.0 |
| `maxIterations` | Maximum gradient descent steps | 1000 | 100-5000 |
| `goalThreshold` | Distance threshold for goal detection | 0.5 | 0.1-2.0 |

## 🎮 Usage Guide

### Basic Operation

1. **Generate a Maze**
   - Choose algorithm: Recursive Backtracker, Randomized Prim's, or Random Obstacles
   - Set grid dimensions (5×5 to 50×50)
   - Configure density for obstacle-based mazes
   - Click "Generate Maze"

2. **Edit the Maze**
   - **Left-click + drag**: Paint walls
   - **Right-click**: Remove walls  
   - **Drag markers**: Reposition start (🎯) and goal (🏁)

3. **Configure Algorithm**
   - Adjust momentum, repulsion, and other parameters
   - Enable/disable completeness fallback
   - Set animation speed (Fast/Normal/Slow)

4. **Run Pathfinding**
   - Click "Start Pathfinding" for animated execution
   - Use "Step" for manual step-by-step control
   - View real-time statistics and performance metrics

### Advanced Features

#### Algorithm Comparison
- Compare Novel vs BFS algorithms side-by-side
- View execution time, path length, and exploration efficiency
- Analyze winner determination based on performance metrics

#### Gradient Field Visualization
- Real-time heatmap showing potential field values
- Blue (high potential) to red (low potential/goal) gradient
- Visualize how the algorithm "sees" the environment

## 🏗️ Project Architecture

### Directory Structure
```
src/
├── components/           # React UI components
│   ├── App.tsx          # Main application component
│   ├── GridCanvas.tsx   # Interactive grid visualization
│   ├── ControlPanel.tsx # Algorithm controls and settings
│   └── AlgorithmComparison.tsx # Side-by-side comparison
├── solver/              # Pathfinding algorithms
│   ├── gradientFieldPathfinding.ts # Novel algorithm
│   ├── completenessFallback.ts     # Fallback algorithm  
│   ├── integratedSolver.ts         # Combined solver
│   └── bfsBaseline.ts              # BFS comparison baseline
├── maze/                # Maze generation algorithms
│   ├── recursiveBacktracker.ts    # Perfect maze generation
│   ├── randomPrims.ts             # Prim's algorithm variant
│   └── randomObstacles.ts         # Random obstacle placement
├── utils/               # Utility functions
│   ├── gridUtils.ts     # Grid manipulation and validation
│   ├── mathUtils.ts     # Mathematical operations
│   └── seededRng.ts     # Seeded random number generation
├── store/               # State management
│   └── appStore.ts      # Zustand global state store
└── types/               # TypeScript type definitions
    ├── grid.ts          # Core grid and pathfinding types
    └── benchmarking.ts  # Performance measurement types
```

### Key Technologies

- **React 18.3** - UI framework with modern hooks
- **TypeScript 5.6** - Type-safe development
- **Tailwind CSS 4.1** - Utility-first styling
- **Zustand** - Lightweight state management  
- **Vite** - Fast development build tool
- **Vitest** - Unit testing framework

## 📊 Performance Analysis

### Complexity Analysis

| Algorithm | Time Complexity | Space Complexity | Optimality |
|-----------|----------------|------------------|------------|
| Novel Gradient Field | O(N) avg, O(N²) worst | O(N) | Near-optimal* |
| BFS Baseline | O(V + E) | O(V) | Optimal |
| Completeness Fallback | O(N²) | O(N) | Optimal |

*Near-optimal due to gradient descent approximation, guaranteed optimal with fallback

### Benchmark Results

Performance characteristics vary by maze type:
- **Open mazes**: Novel algorithm often faster due to direct gradient descent
- **Dense mazes**: BFS may outperform due to systematic exploration
- **Complex mazes**: Fallback ensures completeness when needed

## 🔧 Development

### Running Tests
```bash
npm test
```

### Code Formatting
```bash
npm run lint
npm run format
```

### Type Checking
```bash
npm run type-check
```

### Project Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run test suite
npm run lint     # Lint code
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`) 
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Maintain test coverage for new features
- Use semantic commit messages
- Update documentation for API changes

## 📚 Algorithm Theory

### Physics-Inspired Pathfinding

The novel algorithm draws inspiration from:
- **Electrostatic Fields**: Goal acts as attractive charge
- **Fluid Dynamics**: Smooth particle flow around obstacles
- **Momentum Mechanics**: Inertial movement for natural paths
- **Escape Velocity**: Random perturbations to avoid local minima

### Mathematical Foundation

The potential field U(x,y) combines:
1. **Attractive Potential**: U_goal = -k * distance_to_goal
2. **Repulsive Potential**: U_wall = Σ A * exp(-d²/2σ²) for nearby walls  
3. **Gradient Computation**: ∇U = (∂U/∂x, ∂U/∂y)
4. **Momentum Update**: v_new = α * v_old + β * (-∇U)

## 🙏 Acknowledgments

- Inspired by classical potential field methods in robotics
- BFS implementation follows standard graph traversal algorithms  
- Maze generation algorithms based on established computer science literature
- UI design influenced by modern data visualization principles

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🐛 Known Issues

- Tailwind CSS v4 compatibility (some utility classes may not render)
- Performance optimization needed for very large grids (>100×100)
- Gradient field visualization could benefit from smoother interpolation

## 🔮 Future Enhancements

- [ ] A* algorithm comparison baseline  
- [ ] 3D maze visualization
- [ ] WebGL-accelerated gradient field rendering
- [ ] Machine learning-based parameter optimization
- [ ] Multi-objective pathfinding (shortest + smoothest)
- [ ] Real-time collaborative maze editing

---

**Built with ❤️ and ⚡ by the Novel Pathfinding Team**

For questions, suggestions, or contributions, please open an issue or reach out!