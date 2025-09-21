import type { Grid, MazeGenerationOptions } from '../types/grid'
import { MazeType } from '../types/grid'
import { generateRecursiveBacktrackerMaze } from './recursiveBacktracker'
import { generateRandomPrimsMaze } from './randomPrims'
import { generateRandomObstaclesMaze } from './randomObstacles'

/**
 * Unified maze generation factory
 * 
 * Provides a single interface for generating different types of mazes
 * with consistent options and error handling.
 */

export interface ExtendedMazeGenerationOptions extends MazeGenerationOptions {
  type: MazeType
}

/**
 * Generate a maze using the specified algorithm
 */
export function generateMaze(options: ExtendedMazeGenerationOptions): Grid {
  const { type, ...mazeOptions } = options
  
  // Validate options
  if (mazeOptions.width < 5 || mazeOptions.height < 5) {
    throw new Error('Maze dimensions must be at least 5x5')
  }
  
  if (mazeOptions.width > 200 || mazeOptions.height > 200) {
    throw new Error('Maze dimensions cannot exceed 200x200')
  }
  
  // Set default seed if not provided
  if (!mazeOptions.seed) {
    mazeOptions.seed = Date.now().toString()
  }
  
  try {
    switch (type) {
      case MazeType.RecursiveBacktracker:
        return generateRecursiveBacktrackerMaze(mazeOptions)
        
      case MazeType.RandomPrims:
        return generateRandomPrimsMaze(mazeOptions)
        
      case MazeType.RandomObstacles:
        // Set default obstacle density if not provided
        if (mazeOptions.obstaclesDensity === undefined) {
          mazeOptions.obstaclesDensity = 0.25
        }
        return generateRandomObstaclesMaze(mazeOptions)
        
      default:
        throw new Error(`Unknown maze type: ${type}`)
    }
  } catch (error) {
    console.error(`Failed to generate ${type} maze:`, error)
    throw error
  }
}

/**
 * Get human-readable name for maze type
 */
export function getMazeTypeName(type: MazeType): string {
  switch (type) {
    case MazeType.RecursiveBacktracker:
      return 'Recursive Backtracker'
    case MazeType.RandomPrims:
      return "Randomized Prim's Algorithm"
    case MazeType.RandomObstacles:
      return 'Random Obstacles'
    default:
      return 'Unknown'
  }
}

/**
 * Get description for maze type
 */
export function getMazeTypeDescription(type: MazeType): string {
  switch (type) {
    case MazeType.RecursiveBacktracker:
      return 'Perfect maze with exactly one path between any two points. Uses depth-first search with backtracking to create long winding corridors.'
    case MazeType.RandomPrims:
      return 'Perfect maze generated using randomized minimum spanning tree. Creates more organic, branching patterns with shorter dead ends.'
    case MazeType.RandomObstacles:
      return 'Open maze with randomly placed obstacles. Multiple paths possible, good for testing algorithms on different topologies.'
    default:
      return 'Unknown maze type'
  }
}

/**
 * Get default options for maze type
 */
export function getDefaultMazeOptions(type: MazeType, width: number, height: number): ExtendedMazeGenerationOptions {
  const baseOptions: ExtendedMazeGenerationOptions = {
    type,
    width,
    height,
    seed: Date.now().toString(),
  }
  
  if (type === MazeType.RandomObstacles) {
    baseOptions.obstaclesDensity = 0.25
  }
  
  return baseOptions
}

/**
 * Validate maze generation options
 */
export function validateMazeOptions(options: ExtendedMazeGenerationOptions): string[] {
  const errors: string[] = []
  
  if (options.width < 5 || options.height < 5) {
    errors.push('Maze dimensions must be at least 5x5')
  }
  
  if (options.width > 200 || options.height > 200) {
    errors.push('Maze dimensions cannot exceed 200x200')
  }
  
  if (options.type === MazeType.RandomObstacles) {
    if (options.obstaclesDensity !== undefined) {
      if (options.obstaclesDensity < 0.05 || options.obstaclesDensity > 0.8) {
        errors.push('Obstacle density must be between 0.05 and 0.8')
      }
    }
  }
  
  return errors
}

// Re-export individual generators for direct use if needed
export { generateRecursiveBacktrackerMaze } from './recursiveBacktracker'
export { generateRandomPrimsMaze } from './randomPrims'
export { generateRandomObstaclesMaze } from './randomObstacles'