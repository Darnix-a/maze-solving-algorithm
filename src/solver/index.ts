/**
 * Unified Pathfinding Solver Interface
 * 
 * This module exports all pathfinding algorithms and provides a unified interface
 * for using them in different contexts throughout the application.
 * 
 * Available Algorithms:
 * 1. Novel Gradient Field Pathfinding (Primary)
 * 2. Completeness Fallback (Manhattan Ring Search)
 * 3. Integrated Solver (Novel + Fallback)
 * 4. BFS Benchmark (Comparison only)
 */

import type { Grid, PathfindingResult, PathfindingStep } from '../types/grid'

// Export all individual solvers
export { GradientFieldPathfinder, DEFAULT_GRADIENT_OPTIONS } from './gradientFieldPathfinding'
export { CompletenessFallback } from './completenessFallback'
export { IntegratedSolver, DEFAULT_INTEGRATED_OPTIONS } from './integratedSolver'
export { BFSBenchmark, createBFSBenchmark, runBFSBenchmark } from './bfs_benchmark'

// Import classes for internal use
import { GradientFieldPathfinder } from './gradientFieldPathfinding'
import { CompletenessFallback } from './completenessFallback'
import { IntegratedSolver } from './integratedSolver'
import { BFSBenchmark } from './bfs_benchmark'

// Export types
export type { GradientFieldOptions } from './gradientFieldPathfinding'
export type { IntegratedSolverOptions } from './integratedSolver'

/**
 * Algorithm types for easy selection
 */
export enum AlgorithmType {
  Novel = 'novel',
  Gradient = 'gradient',
  Fallback = 'fallback',
  BFS = 'bfs',
  Integrated = 'integrated'
}

/**
 * Solver factory interface
 */
export interface SolverFactory {
  create(grid: Grid, options?: any): PathfindingSolver
  algorithmName: string
  description: string
  isNovel: boolean
}

/**
 * Common pathfinding solver interface
 */
export interface PathfindingSolver {
  findPath(): Promise<PathfindingResult>
  stepIterator(): AsyncGenerator<PathfindingStep>
  getConfiguration?(): any
  getStatistics?(): any
  reset?(): void
}

/**
 * Registry of available solvers
 */
class SolverRegistry {
  private factories = new Map<AlgorithmType, SolverFactory>()

  constructor() {
    this.registerDefaultSolvers()
  }

  private registerDefaultSolvers(): void {
    // Register Novel Integrated Solver (Primary)
    this.register(AlgorithmType.Integrated, {
      create: (grid, options) => {
        return new IntegratedSolver(grid, options)
      },
      algorithmName: 'Integrated Novel Solver',
      description: 'Novel Gradient Field Pathfinding with Completeness Fallback',
      isNovel: true
    })

    // Register Pure Novel Gradient Field
    this.register(AlgorithmType.Novel, {
      create: (grid, options) => {
        return new GradientFieldPathfinder(grid, options)
      },
      algorithmName: 'Gradient Field Pathfinding',
      description: 'Physics-inspired potential field navigation',
      isNovel: true
    })

    // Register Completeness Fallback
    this.register(AlgorithmType.Fallback, {
      create: (grid, options) => {
        return new CompletenessFallback(grid)
      },
      algorithmName: 'Completeness Fallback',
      description: 'Manhattan Ring Search for guaranteed completeness',
      isNovel: true
    })

    // Register BFS Benchmark (Comparison only)
    this.register(AlgorithmType.BFS, {
      create: (grid, options) => {
        return new BFSBenchmark(grid)
      },
      algorithmName: 'BFS Baseline',
      description: 'Classical Breadth-First Search (Benchmark only)',
      isNovel: false
    })
  }

  register(type: AlgorithmType, factory: SolverFactory): void {
    this.factories.set(type, factory)
  }

  get(type: AlgorithmType): SolverFactory | undefined {
    return this.factories.get(type)
  }

  getAll(): Map<AlgorithmType, SolverFactory> {
    return new Map(this.factories)
  }

  getNovelAlgorithms(): Map<AlgorithmType, SolverFactory> {
    const novelAlgorithms = new Map<AlgorithmType, SolverFactory>()
    
    for (const [type, factory] of this.factories) {
      if (factory.isNovel) {
        novelAlgorithms.set(type, factory)
      }
    }
    
    return novelAlgorithms
  }
}

// Global solver registry
const solverRegistry = new SolverRegistry()

/**
 * Create a pathfinding solver of the specified type
 */
export function createSolver(
  type: AlgorithmType, 
  grid: Grid, 
  options?: any
): PathfindingSolver {
  const factory = solverRegistry.get(type)
  
  if (!factory) {
    throw new Error(`Unknown algorithm type: ${type}`)
  }
  
  return factory.create(grid, options)
}

/**
 * Get the default/recommended solver for general use
 */
export function createDefaultSolver(grid: Grid, options?: any): PathfindingSolver {
  return createSolver(AlgorithmType.Integrated, grid, options)
}

/**
 * Get all available algorithm types and their metadata
 */
export function getAvailableAlgorithms(): Array<{
  type: AlgorithmType
  name: string
  description: string
  isNovel: boolean
  recommended?: boolean
}> {
  const algorithms = []
  
  for (const [type, factory] of solverRegistry.getAll()) {
    algorithms.push({
      type,
      name: factory.algorithmName,
      description: factory.description,
      isNovel: factory.isNovel,
      recommended: type === AlgorithmType.Integrated
    })
  }
  
  return algorithms
}

/**
 * Check if an algorithm type is novel (not a classical pathfinding algorithm)
 */
export function isNovelAlgorithm(type: AlgorithmType): boolean {
  const factory = solverRegistry.get(type)
  return factory?.isNovel ?? false
}

/**
 * Run a quick comparison between two algorithms
 */
export async function compareAlgorithms(
  grid: Grid,
  type1: AlgorithmType,
  type2: AlgorithmType,
  options1?: any,
  options2?: any
): Promise<{
  algorithm1: { type: AlgorithmType; result: PathfindingResult }
  algorithm2: { type: AlgorithmType; result: PathfindingResult }
  comparison: {
    fasterAlgorithm: AlgorithmType
    shorterPath: AlgorithmType
    fewerExplored: AlgorithmType
    runtimeDifference: number
    pathLengthDifference: number
    exploredCountDifference: number
  }
}> {
  const solver1 = createSolver(type1, grid, options1)
  const solver2 = createSolver(type2, grid, options2)

  const [result1, result2] = await Promise.all([
    solver1.findPath(),
    solver2.findPath()
  ])

  const comparison = {
    fasterAlgorithm: result1.runtime < result2.runtime ? type1 : type2,
    shorterPath: result1.pathLength < result2.pathLength ? type1 : type2,
    fewerExplored: result1.exploredCount < result2.exploredCount ? type1 : type2,
    runtimeDifference: Math.abs(result1.runtime - result2.runtime),
    pathLengthDifference: Math.abs(result1.pathLength - result2.pathLength),
    exploredCountDifference: Math.abs(result1.exploredCount - result2.exploredCount)
  }

  return {
    algorithm1: { type: type1, result: result1 },
    algorithm2: { type: type2, result: result2 },
    comparison
  }
}

/**
 * Utility function to register custom solvers
 */
export function registerCustomSolver(
  type: AlgorithmType,
  factory: SolverFactory
): void {
  solverRegistry.register(type, factory)
}

/**
 * Export the solver registry for advanced use cases
 */
export { solverRegistry }

/**
 * Predefined algorithm configurations for common use cases
 */
export const ALGORITHM_CONFIGS = {
  // Fast exploration (prioritize speed over optimality)
  FAST: {
    type: AlgorithmType.Novel,
    options: {
      momentumFactor: 0.9,
      maxIterations: 500,
      goalThreshold: 1.0
    }
  },
  
  // Balanced (good compromise between speed and path quality)
  BALANCED: {
    type: AlgorithmType.Integrated,
    options: {
      momentumFactor: 0.7,
      maxIterations: 1000,
      goalThreshold: 0.5,
      enableFallback: true
    }
  },
  
  // Precise (prioritize path optimality and completeness)
  PRECISE: {
    type: AlgorithmType.Integrated,
    options: {
      momentumFactor: 0.5,
      maxIterations: 2000,
      goalThreshold: 0.3,
      enableFallback: true,
      primaryTimeout: 10000
    }
  },
  
  // Comparison (for benchmarking against classical algorithms)
  BENCHMARK: {
    type: AlgorithmType.BFS,
    options: {}
  }
}