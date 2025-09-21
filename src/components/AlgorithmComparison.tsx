import React, { useState, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import GridCanvas from './GridCanvas'
import type { Point } from '../types/grid'
import { CellType } from '../types/grid'
import type { BenchmarkResult } from '../types/benchmarking'
import { IntegratedSolver } from '../solver/integratedSolver'
import { BFSSolver } from '../solver/bfsSolver'

/**
 * Algorithm Comparison Component
 * 
 * Features:
 * - Side-by-side visualization of Novel vs BFS algorithms
 * - Synchronized execution and step-by-step comparison
 * - Performance metrics comparison
 * - Real-time statistics display
 */

interface ComparisonState {
  novelSolver: IntegratedSolver | null
  bfsSolver: BFSSolver | null
  isRunning: boolean
  currentStep: number
  novelResults: ComparisonData
  bfsResults: ComparisonData
  winner: 'novel' | 'bfs' | 'tie' | null
}

interface ComparisonData {
  exploredCells: Point[]
  frontierCells: Point[]
  pathCells: Point[]
  isComplete: boolean
  executionTime: number
  pathLength: number
  cellsExplored: number
}

const initialComparisonData: ComparisonData = {
  exploredCells: [],
  frontierCells: [],
  pathCells: [],
  isComplete: false,
  executionTime: 0,
  pathLength: 0,
  cellsExplored: 0
}

export const AlgorithmComparison: React.FC = () => {
  const {
    grid,
    solverConfig,
    setBenchmarkResults
  } = useAppStore()

  const [comparisonState, setComparisonState] = useState<ComparisonState>({
    novelSolver: null,
    bfsSolver: null,
    isRunning: false,
    currentStep: 0,
    novelResults: initialComparisonData,
    bfsResults: initialComparisonData,
    winner: null
  })

  const animationFrameRef = useRef<number | undefined>(undefined)
  const comparisonStateRef = useRef(comparisonState)
  
  // Update ref whenever state changes
  React.useEffect(() => {
    comparisonStateRef.current = comparisonState
  }, [comparisonState])

  // Initialize both solvers
  const initializeSolvers = useCallback(() => {
    const novelSolver = new IntegratedSolver(grid, solverConfig)
    const bfsSolver = new BFSSolver(grid)
    
    setComparisonState(prev => ({
      ...prev,
      novelSolver,
      bfsSolver,
      currentStep: 0,
      novelResults: initialComparisonData,
      bfsResults: initialComparisonData,
      winner: null
    }))

    return { novelSolver, bfsSolver }
  }, [grid, solverConfig])

  // Run both algorithms and compare results
  const runComparison = useCallback(async () => {
    const { novelSolver, bfsSolver } = initializeSolvers()
    
    setComparisonState(prev => ({ ...prev, isRunning: true }))

    try {
      // Run both algorithms concurrently
      const [novelResult, bfsResult] = await Promise.all([
        novelSolver.findPath(),
        bfsSolver.solve()
      ])

      // Update results
      const finalNovelData: ComparisonData = {
        exploredCells: [], // This would need to be extracted from result
        frontierCells: [],
        pathCells: novelResult.path,
        isComplete: novelResult.success,
        executionTime: novelResult.runtime,
        pathLength: novelResult.pathLength || novelResult.path.length,
        cellsExplored: novelResult.exploredCount
      }

      const finalBfsData: ComparisonData = {
        exploredCells: bfsResult.exploredCells,
        frontierCells: bfsResult.frontierCells,
        pathCells: bfsResult.finalPath,
        isComplete: bfsResult.isComplete,
        executionTime: bfsResult.executionTimeMs,
        pathLength: bfsResult.finalPath.length,
        cellsExplored: bfsResult.totalCellsExplored
      }

      // Determine winner
      let winner: 'novel' | 'bfs' | 'tie' | null = null
      if (novelResult.success && bfsResult.pathFound) {
        if (novelResult.runtime < bfsResult.executionTimeMs) {
          winner = 'novel'
        } else if (bfsResult.executionTimeMs < novelResult.runtime) {
          winner = 'bfs'
        } else {
          winner = 'tie'
        }
      } else if (novelResult.success) {
        winner = 'novel'
      } else if (bfsResult.pathFound) {
        winner = 'bfs'
      }

      setComparisonState(prev => ({
        ...prev,
        novelResults: finalNovelData,
        bfsResults: finalBfsData,
        winner,
        isRunning: false
      }))

      // Save benchmark results
      const benchmarks: BenchmarkResult[] = [
        {
          algorithm: 'Novel Gradient Field',
          pathFound: novelResult.success,
          pathLength: novelResult.pathLength || novelResult.path.length,
          executionTimeMs: novelResult.runtime,
          cellsExplored: novelResult.exploredCount,
          memoryUsed: novelResult.memoryUsed || 0,
          gridSize: grid.width * grid.height,
          mazeComplexity: calculateMazeComplexity()
        },
        {
          algorithm: 'BFS Baseline',
          pathFound: bfsResult.pathFound,
          pathLength: bfsResult.finalPath.length,
          executionTimeMs: bfsResult.executionTimeMs,
          cellsExplored: bfsResult.totalCellsExplored,
          memoryUsed: 0, // BFS doesn't track memory yet
          gridSize: grid.width * grid.height,
          mazeComplexity: calculateMazeComplexity()
        }
      ]

      setBenchmarkResults(benchmarks)

    } catch (error) {
      console.error('Comparison failed:', error)
      setComparisonState(prev => ({ ...prev, isRunning: false }))
    }
  }, [grid, solverConfig, setBenchmarkResults, initializeSolvers])

  // Real-time visual comparison with unlimited speed
  const runVisualComparison = useCallback(() => {
    const { novelSolver, bfsSolver } = initializeSolvers()
    
    setComparisonState(prev => ({ ...prev, isRunning: true }))
    
    // Animation loop that runs both algorithms step by step
    const compareLoop = () => {
      const currentState = comparisonStateRef.current
      
      if (!currentState.isRunning || (!currentState.novelSolver || !currentState.bfsSolver)) {
        return
      }
      
      let novelComplete = currentState.novelResults.isComplete
      let bfsComplete = currentState.bfsResults.isComplete
      
      // Run multiple steps per frame for maximum speed (increased from 20 to 100)
      for (let i = 0; i < 100; i++) {
        if (!novelComplete && currentState.novelSolver) {
          try {
            const novelStep = currentState.novelSolver.step()
            if (novelStep.isComplete) {
              novelComplete = true
            }
            
            setComparisonState(prev => ({
              ...prev,
              novelResults: {
                exploredCells: novelStep.exploredCells,
                frontierCells: novelStep.frontierCells,
                pathCells: novelStep.currentPath || [],
                isComplete: novelStep.isComplete,
                executionTime: novelStep.executionTimeMs,
                pathLength: novelStep.finalPath?.length || 0,
                cellsExplored: novelStep.totalCellsExplored
              }
            }))
          } catch (error) {
            console.error('Novel algorithm error:', error)
            novelComplete = true
          }
        }
        
        if (!bfsComplete && currentState.bfsSolver) {
          try {
            const bfsStep = currentState.bfsSolver.step()
            if (bfsStep.isComplete) {
              bfsComplete = true
            }
            
            setComparisonState(prev => ({
              ...prev,
              bfsResults: {
                exploredCells: bfsStep.exploredCells,
                frontierCells: bfsStep.frontierCells,
                pathCells: bfsStep.finalPath || [],
                isComplete: bfsStep.isComplete,
                executionTime: bfsStep.executionTimeMs,
                pathLength: bfsStep.finalPath?.length || 0,
                cellsExplored: bfsStep.totalCellsExplored
              }
            }))
          } catch (error) {
            console.error('BFS algorithm error:', error)
            bfsComplete = true
          }
        }
        
        // Check if both completed and update winner when both are done
        if (novelComplete && bfsComplete) {
          const novelTime = currentState.novelResults.executionTime
          const bfsTime = currentState.bfsResults.executionTime
          
          let winner: 'novel' | 'bfs' | 'tie' | null = null
          if (currentState.novelResults.isComplete && currentState.bfsResults.isComplete) {
            if (novelTime < bfsTime) {
              winner = 'novel'
            } else if (bfsTime < novelTime) {
              winner = 'bfs'
            } else {
              winner = 'tie'
            }
          } else if (currentState.novelResults.isComplete) {
            winner = 'novel'
          } else if (currentState.bfsResults.isComplete) {
            winner = 'bfs'
          }
          
          setComparisonState(prev => ({ ...prev, winner, isRunning: false }))
          
          // Save benchmark results
          const benchmarks: BenchmarkResult[] = [
            {
              algorithm: 'Novel Gradient Field',
              pathFound: currentState.novelResults.isComplete,
              pathLength: currentState.novelResults.pathLength,
              executionTimeMs: currentState.novelResults.executionTime,
              cellsExplored: currentState.novelResults.cellsExplored,
              memoryUsed: 0,
              gridSize: grid.width * grid.height,
              mazeComplexity: calculateMazeComplexity()
            },
            {
              algorithm: 'BFS Baseline',
              pathFound: currentState.bfsResults.isComplete,
              pathLength: currentState.bfsResults.pathLength,
              executionTimeMs: currentState.bfsResults.executionTime,
              cellsExplored: currentState.bfsResults.cellsExplored,
              memoryUsed: 0,
              gridSize: grid.width * grid.height,
              mazeComplexity: calculateMazeComplexity()
            }
          ]
          
          setBenchmarkResults(benchmarks)
          return // Only stop when BOTH are complete
        }
      }
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(compareLoop)
    }
    
    animationFrameRef.current = requestAnimationFrame(compareLoop)
  }, [initializeSolvers, grid.width, grid.height, setBenchmarkResults])

  // Calculate maze complexity metric
  const calculateMazeComplexity = useCallback((): number => {
    let wallCount = 0
    const totalCells = grid.width * grid.height

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y][x].type === CellType.Wall) {
          wallCount++
        }
      }
    }

    return wallCount / totalCells
  }, [grid])

  // Stop comparison
  const stopComparison = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setComparisonState(prev => ({ ...prev, isRunning: false }))
  }, [])

  // Reset comparison
  const resetComparison = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setComparisonState({
      novelSolver: null,
      bfsSolver: null,
      isRunning: false,
      currentStep: 0,
      novelResults: initialComparisonData,
      bfsResults: initialComparisonData,
      winner: null
    })
  }, [])

  const getWinnerDisplay = () => {
    switch (comparisonState.winner) {
      case 'novel':
        return (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            🏆 <strong>Novel Algorithm Wins!</strong> Faster execution time
          </div>
        )
      case 'bfs':
        return (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            🏆 <strong>BFS Wins!</strong> Faster execution time
          </div>
        )
      case 'tie':
        return (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            🤝 <strong>Tie!</strong> Both algorithms performed equally
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Algorithm Comparison
        </h1>
        <p className="text-gray-600">
          Side-by-side comparison of Novel Gradient Field vs Classic BFS pathfinding
        </p>
      </div>

      {/* Winner Display */}
      {comparisonState.winner && (
        <div className="mb-6">
          {getWinnerDisplay()}
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-center space-x-4">
          {!comparisonState.isRunning ? (
            <>
              <button
                onClick={runVisualComparison}
                className="btn-primary"
              >
                🚀 Start Comparison (Unlimited Speed)
              </button>
              <button
                onClick={resetComparison}
                className="btn-secondary"
              >
                🔄 Reset
              </button>
            </>
          ) : (
            <button
              onClick={stopComparison}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
            >
              ⏹️ Stop Comparison
            </button>
          )}
        </div>
      </div>

      {/* Side-by-side Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Novel Algorithm */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-green-600">
              🌊 Novel Gradient Field Algorithm
            </h2>
            <p className="text-sm text-gray-600">
              Physics-inspired pathfinding with momentum
            </p>
          </div>
          
          <div className="flex justify-center mb-4">
            <GridCanvas
              showGradientField={true}
              exploredCells={comparisonState.novelResults.exploredCells}
              frontierCells={comparisonState.novelResults.frontierCells}
              pathCells={comparisonState.novelResults.pathCells}
            />
          </div>

          {/* Novel Algorithm Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 font-medium">Execution Time</div>
              <div className="text-green-900">
                {comparisonState.novelResults.executionTime.toFixed(1)}ms
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 font-medium">Path Length</div>
              <div className="text-green-900">
                {comparisonState.novelResults.pathLength}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 font-medium">Cells Explored</div>
              <div className="text-green-900">
                {comparisonState.novelResults.cellsExplored}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 font-medium">Status</div>
              <div className="text-green-900">
                {comparisonState.novelResults.isComplete ? '✅ Complete' : '⏳ Running'}
              </div>
            </div>
          </div>
        </div>

        {/* BFS Algorithm */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-blue-600">
              📊 Classic BFS Algorithm
            </h2>
            <p className="text-sm text-gray-600">
              Optimal breadth-first search baseline
            </p>
          </div>
          
          <div className="flex justify-center mb-4">
            <GridCanvas
              showGradientField={false}
              exploredCells={comparisonState.bfsResults.exploredCells}
              frontierCells={comparisonState.bfsResults.frontierCells}
              pathCells={comparisonState.bfsResults.pathCells}
            />
          </div>

          {/* BFS Algorithm Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 font-medium">Execution Time</div>
              <div className="text-blue-900">
                {comparisonState.bfsResults.executionTime.toFixed(1)}ms
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 font-medium">Path Length</div>
              <div className="text-blue-900">
                {comparisonState.bfsResults.pathLength}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 font-medium">Cells Explored</div>
              <div className="text-blue-900">
                {comparisonState.bfsResults.cellsExplored}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 font-medium">Status</div>
              <div className="text-blue-900">
                {comparisonState.bfsResults.isComplete ? '✅ Complete' : '⏳ Running'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison Table */}
      {(comparisonState.novelResults.isComplete || comparisonState.bfsResults.isComplete) && (
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            📈 Performance Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Algorithm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time (ms)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Path Length
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cells Explored
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Novel Gradient Field
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.novelResults.executionTime.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.novelResults.pathLength}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.novelResults.cellsExplored}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.novelResults.pathLength > 0 ? 
                      (comparisonState.novelResults.cellsExplored / comparisonState.novelResults.pathLength).toFixed(2) : 
                      'N/A'}
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    BFS Baseline
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.bfsResults.executionTime.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.bfsResults.pathLength}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.bfsResults.cellsExplored}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {comparisonState.bfsResults.pathLength > 0 ? 
                      (comparisonState.bfsResults.cellsExplored / comparisonState.bfsResults.pathLength).toFixed(2) : 
                      'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AlgorithmComparison