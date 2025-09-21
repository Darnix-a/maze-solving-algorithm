/**
 * Unified Maze Generator
 * 
 * Factory module that provides a unified interface for all maze generation algorithms
 */

import { generateRecursiveBacktrackerMaze } from './recursiveBacktracker'
import { generateRandomPrimsMaze } from './randomPrims'
import { generateRandomObstaclesMaze } from './randomObstacles'
import type { Grid, MazeGenerationOptions } from '../types/grid'

export type MazeGenerationType = 'recursive-backtracker' | 'randomized-prims' | 'random-obstacles'

export interface MazeConfig {
  width: number
  height: number
  type: MazeGenerationType
  seed: number
  density?: number
  [key: string]: any
}

/**
 * Generate a maze using the specified algorithm
 * @param config - Maze generation configuration
 * @returns Promise that resolves to the generated grid
 */
export async function generateMaze(config: MazeConfig): Promise<Grid> {
  const options: MazeGenerationOptions = {
    width: config.width,
    height: config.height,
    seed: config.seed.toString(),
    ...(config.density !== undefined && { obstaclesDensity: config.density })
  }

  switch (config.type) {
    case 'recursive-backtracker':
      return generateRecursiveBacktrackerMaze(options)
    
    case 'randomized-prims':
      return generateRandomPrimsMaze(options)
    
    case 'random-obstacles':
      return generateRandomObstaclesMaze(options)
    
    default:
      throw new Error(`Unknown maze generation type: ${config.type}`)
  }
}

/**
 * Get metadata about a maze generation algorithm
 * @param type - Algorithm type
 * @returns Algorithm metadata
 */
export function getMazeGeneratorInfo(type: MazeGenerationType) {
  const metadata = {
    'recursive-backtracker': {
      name: 'Recursive Backtracker',
      description: 'Creates perfect mazes (one solution) using depth-first search with backtracking',
      guaranteesPath: true,
      parameters: ['seed'],
      complexity: 'O(n²)',
      characteristics: ['Perfect maze', 'Long corridors', 'Few dead ends']
    },
    'randomized-prims': {
      name: "Randomized Prim's Algorithm",
      description: 'Creates perfect mazes by growing a tree of connected passages',
      guaranteesPath: true,
      parameters: ['seed'],
      complexity: 'O(n²)',
      characteristics: ['Perfect maze', 'Shorter corridors', 'More dead ends']
    },
    'random-obstacles': {
      name: 'Random Obstacles',
      description: 'Places obstacles randomly with specified density',
      guaranteesPath: false,
      parameters: ['seed', 'density'],
      complexity: 'O(n²)',
      characteristics: ['Imperfect maze', 'Multiple solutions possible', 'Configurable density']
    }
  }

  return metadata[type] || null
}

/**
 * Validate maze generation configuration
 * @param config - Configuration to validate
 * @returns True if valid, throws error if invalid
 */
export function validateMazeConfig(config: MazeConfig): boolean {
  if (!config) {
    throw new Error('Maze config is required')
  }

  if (config.width < 3 || config.width > 100) {
    throw new Error('Width must be between 3 and 100')
  }

  if (config.height < 3 || config.height > 100) {
    throw new Error('Height must be between 3 and 100')
  }

  if (!['recursive-backtracker', 'randomized-prims', 'random-obstacles'].includes(config.type)) {
    throw new Error(`Invalid maze type: ${config.type}`)
  }

  if (typeof config.seed !== 'number') {
    throw new Error('Seed must be a number')
  }

  if (config.density !== undefined) {
    if (typeof config.density !== 'number' || config.density < 0 || config.density > 1) {
      throw new Error('Density must be a number between 0 and 1')
    }
  }

  return true
}

/**
 * Get all available maze generation algorithms
 * @returns Array of available algorithm types
 */
export function getAvailableMazeTypes(): MazeGenerationType[] {
  return ['recursive-backtracker', 'randomized-prims', 'random-obstacles']
}

export {
  generateRecursiveBacktrackerMaze,
  generateRandomPrimsMaze,
  generateRandomObstaclesMaze
}
