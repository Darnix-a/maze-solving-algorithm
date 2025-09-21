import { create } from 'zustand'
import type { Grid, MazeType, PathfindingResult, PathfindingStep } from '../types/grid'
import type { BenchmarkResult } from '../types/benchmarking'
import { createEmptyGrid } from '../utils/gridUtils'
import { DEFAULT_GRADIENT_OPTIONS } from '../solver/gradientFieldPathfinding'

export enum AppMode {
  EDIT = 'edit',
  SOLVE = 'solve',
}

export enum PlayState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused',
}

/**
 * Maze generation configuration
 */
export interface MazeConfig {
  width: number
  height: number
  type: string
  seed: number
  density?: number
  [key: string]: any
}

/**
 * Solver configuration combining all pathfinding options
 */
export interface SolverConfig {
  /** Momentum factor for gradient descent (0 = no momentum, 0.9 = high momentum) */
  momentumFactor: number
  /** Standard deviation for Gaussian repulsion around walls */
  repulsionSigma: number
  /** Strength of repulsive forces from walls */
  repulsionStrength: number
  /** Maximum number of iterations before declaring failure */
  maxIterations: number
  /** Distance threshold for considering goal reached */
  goalThreshold: number
  /** Enable randomness for escape mechanisms */
  enableRandomness: boolean
  /** Random perturbation strength when stuck */
  perturbationStrength: number
  /** Number of steps to attempt escape before fallback */
  escapeAttempts: number
  /** Enable completeness fallback */
  enableFallback: boolean
}

export interface AppState {
  // Core state
  grid: Grid
  mode: AppMode
  playState: PlayState

  // Configuration state
  mazeConfig: MazeConfig
  solverConfig: SolverConfig

  // Pathfinding state
  pathfindingResults: PathfindingResult | null
  currentStep: PathfindingStep | null
  stepHistory: PathfindingStep[]
  isAnimating: boolean
  animationSpeed: number // ms per step

  // Benchmarking state
  benchmarkResults: BenchmarkResult[]

  // Settings
  showExplored: boolean
  showPath: boolean
  showGradientField: boolean
  gridSize: number

  // Actions
  setGrid: (grid: Grid) => void
  setMode: (mode: AppMode) => void
  setPlayState: (state: PlayState) => void
  setMazeConfig: (config: MazeConfig) => void
  setSolverConfig: (config: SolverConfig) => void
  setPathfindingResults: (results: PathfindingResult | null) => void
  setCurrentStep: (step: PathfindingStep | null) => void
  addStep: (step: PathfindingStep) => void
  clearSteps: () => void
  setBenchmarkResults: (results: BenchmarkResult[]) => void
  addBenchmarkResult: (result: BenchmarkResult) => void
  setAnimationSpeed: (speed: number) => void
  toggleVisualization: (type: 'explored' | 'path' | 'gradient') => void
  setGridSize: (size: number) => void
  reset: () => void
}

const initialGrid = createEmptyGrid(25, 25)

const defaultMazeConfig: MazeConfig = {
  width: 25,
  height: 25,
  type: 'recursive-backtracker',
  seed: 42,
  density: 0.3
}

const defaultSolverConfig: SolverConfig = {
  ...DEFAULT_GRADIENT_OPTIONS,
  enableFallback: true
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  grid: initialGrid,
  mode: AppMode.EDIT,
  playState: PlayState.STOPPED,
  
  mazeConfig: defaultMazeConfig,
  solverConfig: defaultSolverConfig,
  
  pathfindingResults: null,
  currentStep: null,
  stepHistory: [],
  isAnimating: false,
  animationSpeed: 200,
  
  benchmarkResults: [],
  
  showExplored: true,
  showPath: true,
  showGradientField: true,
  gridSize: 25,

  // Actions
  setGrid: (grid: Grid) => set({ grid }),
  
  setMode: (mode: AppMode) => set({ mode }),
  
  setPlayState: (playState: PlayState) => set({ playState }),
  
  setMazeConfig: (mazeConfig: MazeConfig) => set({ mazeConfig }),
  
  setSolverConfig: (solverConfig: SolverConfig) => set({ solverConfig }),
  
  setPathfindingResults: (pathfindingResults: PathfindingResult | null) => 
    set({ pathfindingResults }),
  
  setCurrentStep: (currentStep: PathfindingStep | null) => set({ currentStep }),
  
  addStep: (step: PathfindingStep) => 
    set(state => ({ stepHistory: [...state.stepHistory, step] })),
  
  clearSteps: () => set({ stepHistory: [], currentStep: null }),
  
  setBenchmarkResults: (benchmarkResults: BenchmarkResult[]) => 
    set({ benchmarkResults }),
  
  addBenchmarkResult: (result: BenchmarkResult) => 
    set(state => ({ benchmarkResults: [...state.benchmarkResults, result] })),
  
  setAnimationSpeed: (animationSpeed: number) => set({ animationSpeed }),
  
  toggleVisualization: (type: 'explored' | 'path' | 'gradient') => {
    const state = get()
    switch (type) {
      case 'explored':
        set({ showExplored: !state.showExplored })
        break
      case 'path':
        set({ showPath: !state.showPath })
        break
      case 'gradient':
        set({ showGradientField: !state.showGradientField })
        break
    }
  },
  
  setGridSize: (gridSize: number) => {
    set({ gridSize })
    // Update grid if size changed
    const newGrid = createEmptyGrid(gridSize, gridSize)
    set({ grid: newGrid })
  },
  
  reset: () => {
    const newGrid = createEmptyGrid(25, 25)
    set({
      grid: newGrid,
      mode: AppMode.EDIT,
      playState: PlayState.STOPPED,
      pathfindingResults: null,
      currentStep: null,
      stepHistory: [],
      isAnimating: false,
      benchmarkResults: [],
      gridSize: 25
    })
  }
}))