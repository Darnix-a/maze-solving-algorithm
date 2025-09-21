import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Line, Radar, Doughnut } from 'react-chartjs-2'
import { useAppStore } from '../store/appStore'
import type { BenchmarkResult } from '../types/benchmarking'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement
)

/**
 * Performance Charts Component
 * 
 * Features:
 * - Execution time comparison charts
 * - Path quality analysis
 * - Exploration efficiency visualization  
 * - Algorithm performance radar chart
 * - Historical performance tracking
 */

interface PerformanceChartsProps {
  className?: string
}

export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ className = '' }) => {
  const { benchmarkResults } = useAppStore()

  // Process benchmark data for visualization
  const chartData = useMemo(() => {
    if (!benchmarkResults || benchmarkResults.length === 0) {
      return null
    }

    // Group results by algorithm
    const algorithmGroups = benchmarkResults.reduce((groups, result) => {
      if (!groups[result.algorithm]) {
        groups[result.algorithm] = []
      }
      groups[result.algorithm].push(result)
      return groups
    }, {} as Record<string, BenchmarkResult[]>)

    const algorithms = Object.keys(algorithmGroups)
    const colors: Record<string, string> = {
      'Novel Gradient Field': 'rgba(34, 197, 94, 0.8)',
      'Gradient Field Pathfinding': 'rgba(34, 197, 94, 0.8)',
      'BFS Baseline': 'rgba(59, 130, 246, 0.8)',
      'Breadth-First Search': 'rgba(59, 130, 246, 0.8)'
    }

    // Execution Time Comparison
    const executionTimeData = {
      labels: algorithms,
      datasets: [
        {
          label: 'Execution Time (ms)',
          data: algorithms.map(alg => {
            const results = algorithmGroups[alg]
            return results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
          }),
          backgroundColor: algorithms.map(alg => colors[alg] || 'rgba(156, 163, 175, 0.8)'),
          borderColor: algorithms.map(alg => colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)'),
          borderWidth: 2
        }
      ]
    }

    // Path Quality Comparison  
    const pathQualityData = {
      labels: algorithms,
      datasets: [
        {
          label: 'Average Path Length',
          data: algorithms.map(alg => {
            const results = algorithmGroups[alg].filter(r => r.pathFound)
            return results.length > 0 ? 
              results.reduce((sum, r) => sum + r.pathLength, 0) / results.length : 0
          }),
          backgroundColor: algorithms.map(alg => colors[alg] || 'rgba(156, 163, 175, 0.8)'),
          borderColor: algorithms.map(alg => colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)'),
          borderWidth: 2
        }
      ]
    }

    // Exploration Efficiency
    const explorationData = {
      labels: algorithms,
      datasets: [
        {
          label: 'Cells Explored',
          data: algorithms.map(alg => {
            const results = algorithmGroups[alg]
            return results.reduce((sum, r) => sum + r.cellsExplored, 0) / results.length
          }),
          backgroundColor: algorithms.map(alg => colors[alg] || 'rgba(156, 163, 175, 0.8)'),
          borderColor: algorithms.map(alg => colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)'),
          borderWidth: 2
        }
      ]
    }

    // Success Rate Doughnut
    const successRateData = {
      labels: algorithms,
      datasets: [
        {
          label: 'Success Rate',
          data: algorithms.map(alg => {
            const results = algorithmGroups[alg]
            const successCount = results.filter(r => r.pathFound).length
            return (successCount / results.length) * 100
          }),
          backgroundColor: algorithms.map(alg => colors[alg] || 'rgba(156, 163, 175, 0.8)'),
          borderWidth: 2
        }
      ]
    }

    // Performance Radar Chart
    const radarData = {
      labels: ['Speed', 'Path Quality', 'Exploration Efficiency', 'Success Rate', 'Memory Usage'],
      datasets: algorithms.map((alg, index) => {
        const results = algorithmGroups[alg]
        const avgTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
        const avgPathLength = results.filter(r => r.pathFound).reduce((sum, r) => sum + r.pathLength, 0) / 
          Math.max(1, results.filter(r => r.pathFound).length)
        const avgExplored = results.reduce((sum, r) => sum + r.cellsExplored, 0) / results.length
        const successRate = (results.filter(r => r.pathFound).length / results.length) * 100
        const avgMemory = results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length

        // Normalize values (0-100 scale, higher is better)
        const maxTime = Math.max(...algorithms.map(a => 
          algorithmGroups[a].reduce((sum, r) => sum + r.executionTimeMs, 0) / algorithmGroups[a].length))
        const maxPath = Math.max(...algorithms.map(a => {
          const pathResults = algorithmGroups[a].filter(r => r.pathFound)
          return pathResults.length > 0 ? pathResults.reduce((sum, r) => sum + r.pathLength, 0) / pathResults.length : 0
        }))
        const maxExplored = Math.max(...algorithms.map(a => 
          algorithmGroups[a].reduce((sum, r) => sum + r.cellsExplored, 0) / algorithmGroups[a].length))
        const maxMemory = Math.max(...algorithms.map(a => 
          algorithmGroups[a].reduce((sum, r) => sum + r.memoryUsed, 0) / algorithmGroups[a].length))

        return {
          label: alg,
          data: [
            maxTime > 0 ? Math.max(0, 100 - (avgTime / maxTime) * 100) : 0, // Speed (inverted)
            maxPath > 0 ? Math.max(0, 100 - (avgPathLength / maxPath) * 100) : 0, // Path quality (inverted)
            maxExplored > 0 ? Math.max(0, 100 - (avgExplored / maxExplored) * 100) : 0, // Efficiency (inverted)
            successRate, // Success rate
            maxMemory > 0 ? Math.max(0, 100 - (avgMemory / maxMemory) * 100) : 0 // Memory (inverted)
          ],
          backgroundColor: colors[alg]?.replace('0.8', '0.2') || 'rgba(156, 163, 175, 0.2)',
          borderColor: colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)',
          borderWidth: 2,
          pointBackgroundColor: colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)'
        }
      })
    }

    // Historical Performance (if multiple runs)
    const historicalData = benchmarkResults.length > 2 ? {
      labels: benchmarkResults.map((_, index) => `Run ${index + 1}`),
      datasets: algorithms.map((alg, index) => ({
        label: alg,
        data: benchmarkResults
          .filter(r => r.algorithm === alg)
          .map(r => r.executionTimeMs),
        borderColor: colors[alg]?.replace('0.8', '1') || 'rgba(156, 163, 175, 1)',
        backgroundColor: colors[alg]?.replace('0.8', '0.1') || 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }))
    } : null

    return {
      executionTimeData,
      pathQualityData,
      explorationData,
      successRateData,
      radarData,
      historicalData,
      algorithms
    }
  }, [benchmarkResults])

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  }

  const barOptions = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const radarOptions = {
    ...commonOptions,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  }

  if (!chartData) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 text-center ${className}`}>
        <div className="text-gray-500">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Performance Data</h3>
          <p>Run some pathfinding algorithms to see performance visualizations here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Performance Analytics
        </h2>
        <p className="text-gray-600">
          Comprehensive algorithm performance analysis and benchmarking
        </p>
      </div>

      {/* Main Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Execution Time */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⚡ Execution Time Comparison
          </h3>
          <div className="h-64">
            <Bar data={chartData.executionTimeData} options={barOptions} />
          </div>
        </div>

        {/* Path Quality */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📏 Path Quality Analysis
          </h3>
          <div className="h-64">
            <Bar data={chartData.pathQualityData} options={barOptions} />
          </div>
        </div>

        {/* Exploration Efficiency */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🔍 Exploration Efficiency
          </h3>
          <div className="h-64">
            <Bar data={chartData.explorationData} options={barOptions} />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 Success Rate Distribution
          </h3>
          <div className="h-64">
            <Doughnut 
              data={chartData.successRateData} 
              options={{
                ...commonOptions,
                plugins: {
                  ...commonOptions.plugins,
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        return `${context.label}: ${context.parsed.toFixed(1)}%`
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Performance Radar Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          🌟 Overall Performance Comparison
        </h3>
        <p className="text-gray-600 mb-6">
          Multi-dimensional performance analysis (higher values indicate better performance)
        </p>
        <div className="h-96">
          <Radar data={chartData.radarData} options={radarOptions} />
        </div>
      </div>

      {/* Historical Performance */}
      {chartData.historicalData && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            📈 Historical Performance Trends
          </h3>
          <div className="h-64">
            <Line 
              data={chartData.historicalData} 
              options={{
                ...commonOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Execution Time (ms)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Algorithm Runs'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📋 Performance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {chartData.algorithms.map((algorithm) => {
            const results = benchmarkResults.filter(r => r.algorithm === algorithm)
            const avgTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
            const successRate = (results.filter(r => r.pathFound).length / results.length) * 100
            const avgPath = results.filter(r => r.pathFound).reduce((sum, r) => sum + r.pathLength, 0) / 
              Math.max(1, results.filter(r => r.pathFound).length)
            
            return (
              <div key={algorithm} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{algorithm}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Time:</span>
                    <span className="font-medium">{avgTime.toFixed(1)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium">{successRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Path:</span>
                    <span className="font-medium">{avgPath.toFixed(1)} cells</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Runs:</span>
                    <span className="font-medium">{results.length}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PerformanceCharts