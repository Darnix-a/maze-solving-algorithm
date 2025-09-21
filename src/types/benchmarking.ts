/**
 * Benchmarking Types
 * 
 * Type definitions for performance measurement and algorithm comparison
 */

/**
 * Result of a single pathfinding benchmark run
 */
export interface BenchmarkResult {
  /** Name of the algorithm tested */
  algorithm: string
  /** Whether a path was found */
  pathFound: boolean
  /** Length of the found path (if any) */
  pathLength: number
  /** Execution time in milliseconds */
  executionTimeMs: number
  /** Number of cells explored during search */
  cellsExplored: number
  /** Memory used (in bytes, if available) */
  memoryUsed: number
  /** Size of the grid (width * height) */
  gridSize: number
  /** Complexity metric of the maze (0-1, wall density) */
  mazeComplexity: number
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Configuration for benchmark runs
 */
export interface BenchmarkConfig {
  /** Number of iterations per test */
  iterations: number
  /** Grid sizes to test */
  gridSizes: number[]
  /** Maze types to test */
  mazeTypes: string[]
  /** Random seeds for reproducible tests */
  seeds: number[]
  /** Timeout per test in milliseconds */
  timeoutMs: number
}

/**
 * Statistical summary of benchmark results
 */
export interface BenchmarkStats {
  /** Algorithm name */
  algorithm: string
  /** Number of successful runs */
  successCount: number
  /** Total number of runs */
  totalRuns: number
  /** Success rate (0-1) */
  successRate: number
  /** Average execution time for successful runs */
  avgExecutionTimeMs: number
  /** Median execution time */
  medianExecutionTimeMs: number
  /** Standard deviation of execution times */
  stdDevExecutionTimeMs: number
  /** Average path length */
  avgPathLength: number
  /** Average cells explored */
  avgCellsExplored: number
  /** Best (shortest) execution time */
  bestTimeMs: number
  /** Worst (longest) execution time */
  worstTimeMs: number
}

/**
 * Comparison between multiple algorithms
 */
export interface AlgorithmComparison {
  /** Compared algorithms */
  algorithms: string[]
  /** Grid size for this comparison */
  gridSize: number
  /** Maze complexity for this comparison */
  mazeComplexity: number
  /** Results for each algorithm */
  results: BenchmarkStats[]
  /** Performance rankings */
  rankings: {
    bySpeed: string[]
    bySuccessRate: string[]
    byPathQuality: string[]
    byExploration: string[]
  }
}

/**
 * Real-time performance monitoring data
 */
export interface PerformanceMetrics {
  /** Current algorithm being executed */
  algorithm: string
  /** Current step number */
  step: number
  /** Elapsed time so far */
  elapsedTimeMs: number
  /** Cells explored so far */
  cellsExplored: number
  /** Current path length (if path exists) */
  currentPathLength: number
  /** Estimated memory usage */
  memoryUsage: number
  /** Performance score (higher = better) */
  performanceScore: number
}

