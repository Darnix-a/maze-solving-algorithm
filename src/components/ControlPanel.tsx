import React, { useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { generateMaze, MazeGenerationType, MazeConfig } from '../maze/mazeGenerator'
import { createGrid } from '../utils/gridUtils'

/**
 * Control Panel Component
 * 
 * Features:
 * - Maze generation controls with different algorithms
 * - Grid size configuration
 * - Algorithm parameters (density, seed)
 * - Real-time pathfinding controls
 * - Solver configuration options
 * - Performance monitoring display
 */

interface ControlPanelProps {
  onStartPathfinding?: () => void
  onStopPathfinding?: () => void
  onResetVisualization?: () => void
  onStepPathfinding?: () => void
  className?: string
  isPathfinding?: boolean
  canStep?: boolean
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onStartPathfinding,
  onStopPathfinding,
  onResetVisualization,
  onStepPathfinding,
  className = '',
  isPathfinding = false,
  canStep = false
}) => {
  const {
    grid,
    setGrid,
    mazeConfig,
    setMazeConfig,
    solverConfig,
    setSolverConfig,
    benchmarkResults
  } = useAppStore()

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationSeed, setGenerationSeed] = useState(42)
  
  // Maze generation configuration
  const [mazeType, setMazeType] = useState<MazeGenerationType>('recursive-backtracker')
  const [gridWidth, setGridWidth] = useState(25)
  const [gridHeight, setGridHeight] = useState(25)
  const [obstacleDensity, setObstacleDensity] = useState(0.3)

  // Generate new maze
  const handleGenerateMaze = useCallback(async () => {
    setIsGenerating(true)
    
    try {
      const config: MazeConfig = {
        width: gridWidth,
        height: gridHeight,
        type: mazeType,
        seed: generationSeed,
        ...(mazeType === 'random-obstacles' && { density: obstacleDensity })
      }
      
      const newGrid = await generateMaze(config)
      setGrid(newGrid)
      setMazeConfig(config)
      onResetVisualization?.()
    } catch (error) {
      console.error('Failed to generate maze:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [
    gridWidth,
    gridHeight,
    mazeType,
    generationSeed,
    obstacleDensity,
    setGrid,
    setMazeConfig,
    onResetVisualization
  ])

  // Create empty grid
  const handleCreateEmptyGrid = useCallback(() => {
    const emptyGrid = createGrid(gridWidth, gridHeight)
    setGrid(emptyGrid)
    onResetVisualization?.()
  }, [gridWidth, gridHeight, setGrid, onResetVisualization])

  // Clear current maze (remove walls)
  const handleClearMaze = useCallback(() => {
    const clearedGrid = createGrid(grid.width, grid.height, grid.start, grid.goal)
    setGrid(clearedGrid)
    onResetVisualization?.()
  }, [grid.width, grid.height, grid.start, grid.goal, setGrid, onResetVisualization])

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">Control Panel</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure maze generation and pathfinding algorithms
        </p>
      </div>

      {/* Maze Generation Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800">Maze Generation</h3>
        
        {/* Grid Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={gridWidth}
              onChange={(e) => setGridWidth(parseInt(e.target.value) || 25)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={gridHeight}
              onChange={(e) => setGridHeight(parseInt(e.target.value) || 25)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Maze Algorithm */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Generation Algorithm
          </label>
          <select
            value={mazeType}
            onChange={(e) => setMazeType(e.target.value as MazeGenerationType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="recursive-backtracker">Recursive Backtracker</option>
            <option value="randomized-prims">Randomized Prim's</option>
            <option value="random-obstacles">Random Obstacles</option>
          </select>
        </div>

        {/* Algorithm-specific Parameters */}
        {mazeType === 'random-obstacles' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obstacle Density: {(obstacleDensity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={obstacleDensity}
              onChange={(e) => setObstacleDensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Generation Seed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seed
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={generationSeed}
              onChange={(e) => setGenerationSeed(parseInt(e.target.value) || 42)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => setGenerationSeed(Math.floor(Math.random() * 10000))}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
            >
              Random
            </button>
          </div>
        </div>

        {/* Generation Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateMaze}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors font-medium"
          >
            {isGenerating ? 'Generating...' : 'Generate Maze'}
          </button>
          <button
            onClick={handleCreateEmptyGrid}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Empty
          </button>
          <button
            onClick={handleClearMaze}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Pathfinding Section */}
      <div className="space-y-4 border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium text-gray-800">Pathfinding</h3>
        
        {/* Solver Configuration */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Momentum: {solverConfig.momentumFactor.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.05"
              value={solverConfig.momentumFactor}
              onChange={(e) => setSolverConfig({
                ...solverConfig,
                momentumFactor: parseFloat(e.target.value)
              })}
              className="w-full"
              disabled={isPathfinding}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repulsion Sigma: {solverConfig.repulsionSigma.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={solverConfig.repulsionSigma}
              onChange={(e) => setSolverConfig({
                ...solverConfig,
                repulsionSigma: parseFloat(e.target.value)
              })}
              className="w-full"
              disabled={isPathfinding}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wall Repulsion: {solverConfig.repulsionStrength.toFixed(1)}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={solverConfig.repulsionStrength}
              onChange={(e) => setSolverConfig({
                ...solverConfig,
                repulsionStrength: parseFloat(e.target.value)
              })}
              className="w-full"
              disabled={isPathfinding}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enableFallback"
              checked={solverConfig.enableFallback}
              onChange={(e) => setSolverConfig({
                ...solverConfig,
                enableFallback: e.target.checked
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isPathfinding}
            />
            <label htmlFor="enableFallback" className="text-sm text-gray-700">
              Enable Completeness Fallback
            </label>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {!isPathfinding ? (
            <>
              <button
                onClick={onStartPathfinding}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                Start Pathfinding
              </button>
              {canStep && (
                <button
                  onClick={onStepPathfinding}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
                >
                  Step
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onStopPathfinding}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors font-medium"
            >
              Stop Pathfinding
            </button>
          )}
          <button
            onClick={onResetVisualization}
            disabled={isPathfinding}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Performance Stats */}
      {benchmarkResults && benchmarkResults.length > 0 && (
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-800">Performance</h3>
          {benchmarkResults.slice(-1).map((result, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Algorithm:</span> {result.algorithm}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {result.executionTimeMs.toFixed(1)}ms
                </div>
                <div>
                  <span className="font-medium">Path Length:</span> {result.pathLength || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Cells Explored:</span> {result.cellsExplored}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Success:</span>{' '}
                  <span className={result.pathFound ? 'text-green-600' : 'text-red-600'}>
                    {result.pathFound ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-4">
        <p><strong>Instructions:</strong></p>
        <p>• Click and drag to paint walls</p>
        <p>• Right-click to remove walls</p>
        <p>• Drag start (🎯) and goal (🏁) to reposition</p>
        <p>• Use gradient field visualization to see potential field</p>
      </div>
    </div>
  )
}

export default ControlPanel