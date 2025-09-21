/**
 * Core types for grid representation and pathfinding
 */

export enum CellType {
  Empty = 'empty',
  Wall = 'wall',
  Start = 'start',
  Goal = 'goal',
}

export interface Point {
  x: number
  y: number
}

export interface Cell {
  type: CellType
  position: Point
  // For visualization
  isPath?: boolean
  isExplored?: boolean
  isFrontier?: boolean
  gradientValue?: number
}

export interface Grid {
  width: number
  height: number
  cells: Cell[][]
  start: Point
  goal: Point
}

export interface PathfindingResult {
  path: Point[]
  exploredCount: number
  frontierCount: number
  runtime: number
  memoryUsed?: number
  pathLength: number
  success: boolean
  algorithmName: string
  usedFallback?: boolean
}

export interface PathfindingStep {
  current: Point
  explored: Point[]
  frontier: Point[]
  path: Point[]
  gradientField?: number[][]
  iteration: number
  message?: string
}

export interface MazeGenerationOptions {
  width: number
  height: number
  seed?: string
  obstaclesDensity?: number // For random obstacles only
}

export enum MazeType {
  RecursiveBacktracker = 'recursive-backtracker',
  RandomPrims = 'random-prims',
  RandomObstacles = 'random-obstacles',
}

export interface BenchmarkResult {
  gridSize: number
  mazeType: MazeType
  obstaclesDensity?: number
  seed: string
  algorithmName: string
  runtime: number
  exploredCount: number
  pathLength: number
  memoryUsed: number
  success: boolean
  usedFallback?: boolean
}

export interface BenchmarkSummary {
  config: {
    gridSize: number
    mazeType: MazeType
    obstaclesDensity?: number
  }
  results: {
    algorithmName: string
    trials: number
    avgRuntime: number
    minRuntime: number
    maxRuntime: number
    stdDevRuntime: number
    avgExploredCount: number
    avgPathLength: number
    successRate: number
    fallbackRate?: number
  }[]
}