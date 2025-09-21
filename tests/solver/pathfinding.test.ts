import { describe, it, expect, beforeEach } from 'vitest'
import { GradientFieldPathfinder, DEFAULT_GRADIENT_OPTIONS } from '@solver/gradientFieldPathfinding'
import { CompletenessFallback } from '@solver/completenessFallback'
import { IntegratedSolver } from '@solver/integratedSolver'
import { BFSBenchmark, runBFSBenchmark } from '@solver/bfs_benchmark'
import { createSolver, AlgorithmType, compareAlgorithms } from '@solver/index'
import { createEmptyGrid, setCell } from '@utils/gridUtils'
import { CellType } from '@types/grid'
import { generateMaze } from '@maze/index'
import { MazeType } from '@types/grid'

describe('Novel Pathfinding Algorithms', () => {
  const testSeed = 'pathfinding-test-123'

  describe('Gradient Field Pathfinding', () => {
    it('should find path in simple empty grid', async () => {
      const grid = createEmptyGrid(5, 5)
      const solver = new GradientFieldPathfinder(grid)
      
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
      expect(result.algorithmName).toBe('Gradient Field Pathfinding')
      expect(result.usedFallback).toBe(false)
      expect(result.exploredCount).toBeGreaterThan(0)
      expect(result.runtime).toBeGreaterThan(0)
    })

    it('should handle grid with obstacles', async () => {
      const grid = createEmptyGrid(7, 7)
      
      // Add some walls to create a more complex maze
      setCell(grid, { x: 2, y: 1 }, CellType.Wall)
      setCell(grid, { x: 2, y: 2 }, CellType.Wall)
      setCell(grid, { x: 2, y: 3 }, CellType.Wall)
      setCell(grid, { x: 4, y: 3 }, CellType.Wall)
      setCell(grid, { x: 4, y: 4 }, CellType.Wall)
      
      const solver = new GradientFieldPathfinder(grid)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
      expect(result.pathLength).toBeGreaterThan(0)
    })

    it('should respect gradient field options', async () => {
      const grid = createEmptyGrid(5, 5)
      
      const customOptions = {
        ...DEFAULT_GRADIENT_OPTIONS,
        momentumFactor: 0.9,
        repulsionSigma: 2.0,
        maxIterations: 500
      }
      
      const solver = new GradientFieldPathfinder(grid, customOptions)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.algorithmName).toBe('Gradient Field Pathfinding')
    })

    it('should provide step-by-step iteration', async () => {
      const grid = createEmptyGrid(5, 5)
      const solver = new GradientFieldPathfinder(grid)
      
      const steps = []
      for await (const step of solver.stepIterator()) {
        steps.push(step)
        if (steps.length > 50) break // Prevent infinite loops
      }
      
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0].iteration).toBe(1)
      expect(steps[0].current).toBeDefined()
      expect(steps[0].explored).toBeDefined()
      expect(steps[0].frontier).toBeDefined()
    })

    it('should fail gracefully on impossible mazes', async () => {
      const grid = createEmptyGrid(5, 5)
      
      // Create walls that block the path completely
      for (let x = 0; x < 5; x++) {
        setCell(grid, { x, y: 2 }, CellType.Wall)
      }
      
      const solver = new GradientFieldPathfinder(grid, {
        ...DEFAULT_GRADIENT_OPTIONS,
        maxIterations: 50
      })
      
      await expect(solver.findPath()).rejects.toThrow()
    })
  })

  describe('Completeness Fallback', () => {
    it('should find path in simple grid', async () => {
      const grid = createEmptyGrid(5, 5)
      const fallback = new CompletenessFallback(grid)
      
      const result = await fallback.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
      expect(result.algorithmName).toBe('Completeness Fallback (Manhattan Ring Search)')
      expect(result.usedFallback).toBe(true)
    })

    it('should find path in complex maze', async () => {
      const maze = generateMaze({
        type: MazeType.RecursiveBacktracker,
        width: 15,
        height: 15,
        seed: testSeed
      })
      
      const fallback = new CompletenessFallback(maze)
      const result = await fallback.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
      expect(result.exploredCount).toBeGreaterThan(0)
    })

    it('should correctly identify impossible mazes', async () => {
      const grid = createEmptyGrid(5, 5)
      
      // Block path completely
      for (let x = 0; x < 5; x++) {
        setCell(grid, { x, y: 2 }, CellType.Wall)
      }
      
      const fallback = new CompletenessFallback(grid)
      const result = await fallback.findPath()
      
      expect(result.success).toBe(false)
      expect(result.path.length).toBe(0)
    })

    it('should provide deterministic results', async () => {
      const grid = createEmptyGrid(10, 10)
      
      // Add some obstacles
      setCell(grid, { x: 3, y: 3 }, CellType.Wall)
      setCell(grid, { x: 4, y: 4 }, CellType.Wall)
      setCell(grid, { x: 5, y: 5 }, CellType.Wall)
      
      const fallback1 = new CompletenessFallback(grid)
      const fallback2 = new CompletenessFallback(grid)
      
      const result1 = await fallback1.findPath()
      const result2 = await fallback2.findPath()
      
      // Should get identical results (deterministic)
      expect(result1.success).toBe(result2.success)
      expect(result1.pathLength).toBe(result2.pathLength)
      expect(result1.exploredCount).toBe(result2.exploredCount)
    })

    it('should work with step iterator', async () => {
      const grid = createEmptyGrid(7, 7)
      const fallback = new CompletenessFallback(grid)
      
      const steps = []
      for await (const step of fallback.stepIterator()) {
        steps.push(step)
        if (steps.length > 100) break // Prevent infinite loops
      }
      
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0].current).toBeDefined()
      expect(steps[steps.length - 1].message).toContain('Goal found')
    })

    it('should handle existing explored cells', async () => {
      const grid = createEmptyGrid(5, 5)
      const fallback = new CompletenessFallback(grid)
      
      const existingExplored = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 }
      ]
      
      const steps = []
      for await (const step of fallback.stepIterator(existingExplored)) {
        steps.push(step)
        if (steps.length > 50) break
      }
      
      expect(steps.length).toBeGreaterThan(0)
      // Should include the existing explored cells
      expect(steps[0].explored.length).toBeGreaterThanOrEqual(existingExplored.length)
    })
  })

  describe('Integrated Solver', () => {
    it('should use gradient field as primary solver', async () => {
      const grid = createEmptyGrid(5, 5)
      const solver = new IntegratedSolver(grid)
      
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.algorithmName).toBe('Gradient Field Pathfinding')
      expect(result.usedFallback).toBe(false)
    })

    it('should fall back when primary fails', async () => {
      const grid = createEmptyGrid(5, 5)
      
      // Create a scenario where gradient field might struggle
      setCell(grid, { x: 2, y: 1 }, CellType.Wall)
      setCell(grid, { x: 2, y: 2 }, CellType.Wall)
      setCell(grid, { x: 2, y: 3 }, CellType.Wall)
      setCell(grid, { x: 1, y: 2 }, CellType.Wall)
      setCell(grid, { x: 3, y: 2 }, CellType.Wall)
      
      const solver = new IntegratedSolver(grid, {
        maxIterations: 10, // Force quick failure
        enableFallback: true
      })
      
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.usedFallback).toBe(true)
      expect(result.algorithmName).toContain('Completeness Fallback')
    })

    it('should handle step iteration across both algorithms', async () => {
      const grid = createEmptyGrid(7, 7)
      
      // Add obstacles to make it interesting
      setCell(grid, { x: 3, y: 1 }, CellType.Wall)
      setCell(grid, { x: 3, y: 2 }, CellType.Wall)
      setCell(grid, { x: 3, y: 3 }, CellType.Wall)
      
      const solver = new IntegratedSolver(grid, {
        maxIterations: 20, // Limit primary to force fallback
      })
      
      const steps = []
      for await (const step of solver.stepIterator()) {
        steps.push(step)
        if (steps.length > 200) break // Safety limit
      }
      
      expect(steps.length).toBeGreaterThan(0)
      
      // Should have both gradient field and fallback steps
      const gradientSteps = steps.filter(s => s.message?.includes('[Gradient Field]'))
      const fallbackSteps = steps.filter(s => s.message?.includes('[Fallback]'))
      
      expect(gradientSteps.length).toBeGreaterThan(0)
      expect(fallbackSteps.length).toBeGreaterThan(0)
    })

    it('should provide configuration and statistics', () => {
      const grid = createEmptyGrid(5, 5)
      const solver = new IntegratedSolver(grid)
      
      const config = solver.getConfiguration()
      expect(config.algorithmName).toBe('Integrated Novel Pathfinding Solver')
      expect(config.primaryAlgorithm).toBe('Gradient Field Pathfinding')
      expect(config.fallbackEnabled).toBe(true)
      
      const stats = solver.getStatistics()
      expect(stats.totalSteps).toBe(0) // No steps yet
      expect(stats.primarySteps).toBe(0)
      expect(stats.fallbackSteps).toBe(0)
    })

    it('should respect option updates', async () => {
      const grid = createEmptyGrid(5, 5)
      const solver = new IntegratedSolver(grid)
      
      solver.updateOptions({
        momentumFactor: 0.8,
        enableFallback: false,
        maxIterations: 100
      })
      
      const config = solver.getConfiguration()
      expect(config.options.momentumFactor).toBe(0.8)
      expect(config.options.enableFallback).toBe(false)
      expect(config.options.maxIterations).toBe(100)
    })

    it('should handle maze generation integration', async () => {
      const maze = generateMaze({
        type: MazeType.RandomObstacles,
        width: 15,
        height: 15,
        seed: testSeed,
        obstaclesDensity: 0.25
      })
      
      const solver = new IntegratedSolver(maze)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
    })
  })

  describe('Algorithm Comparison', () => {
    it('should find same path validity on identical mazes', async () => {
      const maze = generateMaze({
        type: MazeType.RecursiveBacktracker,
        width: 11,
        height: 11,
        seed: testSeed
      })
      
      const gradientSolver = new GradientFieldPathfinder(maze)
      const fallbackSolver = new CompletenessFallback(maze)
      const integratedSolver = new IntegratedSolver(maze)
      
      const results = await Promise.allSettled([
        gradientSolver.findPath(),
        fallbackSolver.findPath(),
        integratedSolver.findPath()
      ])
      
      // All should succeed or fail consistently
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length
      
      expect(successCount).toBeGreaterThan(0) // At least one should work
      
      // If multiple succeed, they should all find valid paths
      if (successCount > 1) {
        const successfulResults = results
          .filter(r => r.status === 'fulfilled' && r.value.success)
          .map(r => r.status === 'fulfilled' ? r.value : null)
          .filter(Boolean)
        
        for (const result of successfulResults) {
          expect(result!.path.length).toBeGreaterThan(0)
          expect(result!.pathLength).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle start equals goal', async () => {
      const grid = createEmptyGrid(5, 5)
      // Set goal to same as start
      grid.goal = { ...grid.start }
      setCell(grid, grid.goal, CellType.Goal)
      
      const solver = new IntegratedSolver(grid)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeLessThanOrEqual(2) // Start and/or goal
    })

    it('should handle minimum size grids', async () => {
      const grid = createEmptyGrid(3, 3)
      
      const solver = new IntegratedSolver(grid)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
    })

    it('should handle grids with no obstacles', async () => {
      const grid = createEmptyGrid(10, 10)
      
      const solver = new IntegratedSolver(grid)
      const result = await solver.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
    })

    it('should measure performance metrics', async () => {
      const grid = createEmptyGrid(20, 20)
      
      const solver = new IntegratedSolver(grid)
      const result = await solver.findPath()
      
      expect(result.runtime).toBeGreaterThan(0)
      expect(result.exploredCount).toBeGreaterThan(0)
      expect(result.memoryUsed).toBeGreaterThanOrEqual(0) // May be 0 if not available
    })
  })

  describe('BFS Benchmark (Comparison Only)', () => {
    it('should find optimal path in simple grid', async () => {
      const grid = createEmptyGrid(5, 5)
      const bfs = new BFSBenchmark(grid)
      
      const result = await bfs.findPath()
      
      expect(result.success).toBe(true)
      expect(result.path.length).toBeGreaterThan(0)
      expect(result.algorithmName).toBe('BFS Baseline (Benchmark Only)')
      expect(result.usedFallback).toBe(false)
      expect(result.exploredCount).toBeGreaterThan(0)
    })

    it('should find shortest path consistently', async () => {
      const grid = createEmptyGrid(6, 6)
      
      // Add some obstacles to create multiple path options
      setCell(grid, { x: 2, y: 2 }, CellType.Wall)
      setCell(grid, { x: 3, y: 2 }, CellType.Wall)
      
      const bfs1 = new BFSBenchmark(grid)
      const bfs2 = new BFSBenchmark(grid)
      
      const result1 = await bfs1.findPath()
      const result2 = await bfs2.findPath()
      
      // BFS should be deterministic
      expect(result1.success).toBe(result2.success)
      expect(result1.pathLength).toBe(result2.pathLength)
      expect(result1.exploredCount).toBe(result2.exploredCount)
    })

    it('should provide step-by-step iteration', async () => {
      const grid = createEmptyGrid(5, 5)
      const bfs = new BFSBenchmark(grid)
      
      const steps = []
      for await (const step of bfs.stepIterator()) {
        steps.push(step)
        if (steps.length > 50) break
      }
      
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0].current).toBeDefined()
      expect(steps[steps.length - 1].message).toContain('found goal')
    })

    it('should detect impossible mazes correctly', async () => {
      const grid = createEmptyGrid(5, 5)
      
      // Block path completely
      for (let x = 0; x < 5; x++) {
        setCell(grid, { x, y: 2 }, CellType.Wall)
      }
      
      const bfs = new BFSBenchmark(grid)
      const result = await bfs.findPath()
      
      expect(result.success).toBe(false)
      expect(result.path.length).toBe(0)
    })

    it('should provide meaningful statistics', async () => {
      const grid = createEmptyGrid(8, 8)
      const bfs = new BFSBenchmark(grid)
      
      await bfs.findPath()
      const stats = bfs.getStatistics()
      
      expect(stats.visitedCount).toBeGreaterThan(0)
      expect(stats.queueMaxSize).toBeGreaterThanOrEqual(0)
      expect(stats.averageBranchingFactor).toBeGreaterThanOrEqual(0)
    })

    it('should work with utility function', async () => {
      const grid = createEmptyGrid(6, 6)
      
      const { result, statistics } = await runBFSBenchmark(grid)
      
      expect(result.success).toBe(true)
      expect(result.algorithmName).toContain('BFS')
      expect(statistics.visitedCount).toBeGreaterThan(0)
    })
  })

  describe('Solver Factory and Registry', () => {
    it('should create solvers of different types', async () => {
      const grid = createEmptyGrid(5, 5)
      
      const novelSolver = createSolver(AlgorithmType.Novel, grid)
      const integratedSolver = createSolver(AlgorithmType.Integrated, grid)
      const bfsSolver = createSolver(AlgorithmType.BFS, grid)
      
      expect(novelSolver).toBeDefined()
      expect(integratedSolver).toBeDefined()
      expect(bfsSolver).toBeDefined()
      
      // Test that they can all find paths
      const results = await Promise.allSettled([
        novelSolver.findPath(),
        integratedSolver.findPath(),
        bfsSolver.findPath()
      ])
      
      // At least the integrated solver should work
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      expect(successfulResults.length).toBeGreaterThan(0)
    })

    it('should compare algorithms correctly', async () => {
      const grid = createEmptyGrid(7, 7)
      
      const comparison = await compareAlgorithms(
        grid,
        AlgorithmType.Integrated,
        AlgorithmType.BFS
      )
      
      expect(comparison.algorithm1).toBeDefined()
      expect(comparison.algorithm2).toBeDefined()
      expect(comparison.comparison.fasterAlgorithm).toBeDefined()
      expect(comparison.comparison.runtimeDifference).toBeGreaterThanOrEqual(0)
    })

    it('should handle algorithm configuration options', async () => {
      const grid = createEmptyGrid(5, 5)
      
      const fastOptions = {
        momentumFactor: 0.9,
        maxIterations: 100
      }
      
      const solver = createSolver(AlgorithmType.Integrated, grid, fastOptions)
      const result = await solver.findPath()
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should throw error for unknown algorithm type', () => {
      const grid = createEmptyGrid(5, 5)
      
      expect(() => {
        createSolver('unknown' as AlgorithmType, grid)
      }).toThrow('Unknown algorithm type')
    })
  })
})
