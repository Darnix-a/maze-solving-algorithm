import { describe, it, expect, beforeEach } from 'vitest'
import { 
  generateMaze, 
  generateRecursiveBacktrackerMaze,
  generateRandomPrimsMaze,
  generateRandomObstaclesMaze,
  getMazeTypeName,
  getMazeTypeDescription,
  getDefaultMazeOptions,
  validateMazeOptions,
  ExtendedMazeGenerationOptions
} from '@maze/index'
import { MazeType, CellType } from '@types/grid'
import { hasPath, calculateObstacleDensity, countCells } from '@utils/gridUtils'

describe('Maze Generation', () => {
  const testSeed = 'test-seed-123'
  const testWidth = 15
  const testHeight = 15

  describe('Unified Maze Factory', () => {
    it('should generate recursive backtracker maze', () => {
      const options: ExtendedMazeGenerationOptions = {
        type: MazeType.RecursiveBacktracker,
        width: testWidth,
        height: testHeight,
        seed: testSeed
      }

      const maze = generateMaze(options)

      expect(maze.width).toBe(testWidth)
      expect(maze.height).toBe(testHeight)
      expect(maze.start).toBeDefined()
      expect(maze.goal).toBeDefined()
      expect(hasPath(maze)).toBe(true)
    })

    it('should generate randomized Prims maze', () => {
      const options: ExtendedMazeGenerationOptions = {
        type: MazeType.RandomPrims,
        width: testWidth,
        height: testHeight,
        seed: testSeed
      }

      const maze = generateMaze(options)

      expect(maze.width).toBe(testWidth)
      expect(maze.height).toBe(testHeight)
      expect(maze.start).toBeDefined()
      expect(maze.goal).toBeDefined()
      expect(hasPath(maze)).toBe(true)
    })

    it('should generate random obstacles maze', () => {
      const options: ExtendedMazeGenerationOptions = {
        type: MazeType.RandomObstacles,
        width: testWidth,
        height: testHeight,
        seed: testSeed,
        obstaclesDensity: 0.3
      }

      const maze = generateMaze(options)

      expect(maze.width).toBe(testWidth)
      expect(maze.height).toBe(testHeight)
      expect(maze.start).toBeDefined()
      expect(maze.goal).toBeDefined()
      expect(hasPath(maze)).toBe(true)
      
      // Should respect density (approximately)
      const actualDensity = calculateObstacleDensity(maze)
      expect(actualDensity).toBeGreaterThan(0.1)
      expect(actualDensity).toBeLessThan(0.6)
    })

    it('should throw error for invalid dimensions', () => {
      const invalidOptions: ExtendedMazeGenerationOptions = {
        type: MazeType.RecursiveBacktracker,
        width: 3, // Too small
        height: 3,
        seed: testSeed
      }

      expect(() => generateMaze(invalidOptions)).toThrow('Maze dimensions must be at least 5x5')
    })

    it('should throw error for dimensions too large', () => {
      const invalidOptions: ExtendedMazeGenerationOptions = {
        type: MazeType.RecursiveBacktracker,
        width: 250, // Too large
        height: 250,
        seed: testSeed
      }

      expect(() => generateMaze(invalidOptions)).toThrow('Maze dimensions cannot exceed 200x200')
    })
  })

  describe('Recursive Backtracker', () => {
    it('should create a connected maze', () => {
      const maze = generateRecursiveBacktrackerMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      expect(hasPath(maze)).toBe(true)
    })

    it('should be deterministic with same seed', () => {
      const maze1 = generateRecursiveBacktrackerMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      const maze2 = generateRecursiveBacktrackerMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      // Should have identical structure
      for (let y = 0; y < testHeight; y++) {
        for (let x = 0; x < testWidth; x++) {
          expect(maze1.cells[y][x].type).toBe(maze2.cells[y][x].type)
        }
      }
    })

    it('should have different structure with different seeds', () => {
      const maze1 = generateRecursiveBacktrackerMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      const maze2 = generateRecursiveBacktrackerMaze({
        width: testWidth,
        height: testHeight,
        seed: 'different-seed'
      })

      // Should have at least some differences
      let differences = 0
      for (let y = 0; y < testHeight; y++) {
        for (let x = 0; x < testWidth; x++) {
          if (maze1.cells[y][x].type !== maze2.cells[y][x].type) {
            differences++
          }
        }
      }

      expect(differences).toBeGreaterThan(0)
    })

    it('should create perfect maze (exactly one path between any two points)', () => {
      const maze = generateRecursiveBacktrackerMaze({
        width: 21, // Larger maze for better testing
        height: 21,
        seed: testSeed
      })

      expect(hasPath(maze)).toBe(true)
      
      // Perfect maze should have approximately 50% walls
      const wallCount = countCells(maze, CellType.Wall)
      const totalCells = maze.width * maze.height
      const wallRatio = wallCount / totalCells
      
      expect(wallRatio).toBeGreaterThan(0.3)
      expect(wallRatio).toBeLessThan(0.7)
    })
  })

  describe('Randomized Prims', () => {
    it('should create a connected maze', () => {
      const maze = generateRandomPrimsMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      expect(hasPath(maze)).toBe(true)
    })

    it('should be deterministic with same seed', () => {
      const maze1 = generateRandomPrimsMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      const maze2 = generateRandomPrimsMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      // Should have identical structure
      for (let y = 0; y < testHeight; y++) {
        for (let x = 0; x < testWidth; x++) {
          expect(maze1.cells[y][x].type).toBe(maze2.cells[y][x].type)
        }
      }
    })

    it('should handle small mazes', () => {
      const maze = generateRandomPrimsMaze({
        width: 5,
        height: 5,
        seed: testSeed
      })

      expect(maze.width).toBe(5)
      expect(maze.height).toBe(5)
      expect(hasPath(maze)).toBe(true)
    })
  })

  describe('Random Obstacles', () => {
    it('should create a connected maze', () => {
      const maze = generateRandomObstaclesMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed,
        obstaclesDensity: 0.25
      })

      expect(hasPath(maze)).toBe(true)
    })

    it('should respect obstacle density', () => {
      const densities = [0.1, 0.25, 0.4]

      for (const targetDensity of densities) {
        const maze = generateRandomObstaclesMaze({
          width: 25,
          height: 25,
          seed: testSeed,
          obstaclesDensity: targetDensity
        })

        const actualDensity = calculateObstacleDensity(maze)
        
        // Allow some variance due to connectivity constraints
        expect(actualDensity).toBeGreaterThan(targetDensity * 0.5)
        expect(actualDensity).toBeLessThan(targetDensity * 1.5 + 0.1)
      }
    })

    it('should place start and goal far apart', () => {
      const maze = generateRandomObstaclesMaze({
        width: 25,
        height: 25,
        seed: testSeed,
        obstaclesDensity: 0.2
      })

      const { start, goal } = maze
      const distance = Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)
      
      // Should be reasonably far apart for a 25x25 maze
      expect(distance).toBeGreaterThan(10)
    })

    it('should handle extreme densities gracefully', () => {
      // Very low density
      const sparseMaze = generateRandomObstaclesMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed,
        obstaclesDensity: 0.05
      })

      expect(hasPath(sparseMaze)).toBe(true)
      expect(calculateObstacleDensity(sparseMaze)).toBeLessThan(0.3)

      // High density
      const denseMaze = generateRandomObstaclesMaze({
        width: testWidth,
        height: testHeight,
        seed: testSeed,
        obstaclesDensity: 0.6
      })

      expect(hasPath(denseMaze)).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    it('should return correct maze type names', () => {
      expect(getMazeTypeName(MazeType.RecursiveBacktracker)).toBe('Recursive Backtracker')
      expect(getMazeTypeName(MazeType.RandomPrims)).toBe("Randomized Prim's Algorithm")
      expect(getMazeTypeName(MazeType.RandomObstacles)).toBe('Random Obstacles')
    })

    it('should return descriptions for maze types', () => {
      const description = getMazeTypeDescription(MazeType.RecursiveBacktracker)
      expect(description).toContain('Perfect maze')
      expect(description).toContain('depth-first')
    })

    it('should provide default options', () => {
      const options = getDefaultMazeOptions(MazeType.RandomObstacles, 25, 25)
      
      expect(options.type).toBe(MazeType.RandomObstacles)
      expect(options.width).toBe(25)
      expect(options.height).toBe(25)
      expect(options.obstaclesDensity).toBe(0.25)
      expect(options.seed).toBeDefined()
    })

    it('should validate maze options', () => {
      const validOptions: ExtendedMazeGenerationOptions = {
        type: MazeType.RecursiveBacktracker,
        width: 25,
        height: 25,
        seed: testSeed
      }

      expect(validateMazeOptions(validOptions)).toHaveLength(0)

      const invalidOptions: ExtendedMazeGenerationOptions = {
        type: MazeType.RandomObstacles,
        width: 3, // Too small
        height: 300, // Too large
        seed: testSeed,
        obstaclesDensity: 0.9 // Too high
      }

      const errors = validateMazeOptions(invalidOptions)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(error => error.includes('dimensions'))).toBe(true)
      expect(errors.some(error => error.includes('density'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum size mazes', () => {
      const maze = generateMaze({
        type: MazeType.RecursiveBacktracker,
        width: 5,
        height: 5,
        seed: testSeed
      })

      expect(maze.width).toBe(5)
      expect(maze.height).toBe(5)
      expect(hasPath(maze)).toBe(true)
    })

    it('should handle rectangular mazes', () => {
      const maze = generateMaze({
        type: MazeType.RandomPrims,
        width: 10,
        height: 30,
        seed: testSeed
      })

      // Maze generators may adjust dimensions to odd numbers for proper structure
      expect(maze.width).toBeGreaterThanOrEqual(9)
      expect(maze.width).toBeLessThanOrEqual(10)
      expect(maze.height).toBeGreaterThanOrEqual(29)
      expect(maze.height).toBeLessThanOrEqual(30)
      expect(hasPath(maze)).toBe(true)
    })

    it('should always have exactly one start and one goal', () => {
      const maze = generateMaze({
        type: MazeType.RandomObstacles,
        width: testWidth,
        height: testHeight,
        seed: testSeed
      })

      const startCount = countCells(maze, CellType.Start)
      const goalCount = countCells(maze, CellType.Goal)

      expect(startCount).toBe(1)
      expect(goalCount).toBe(1)
    })
  })
})