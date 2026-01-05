'use client';

import { useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ 
  data, 
  type = 'pie', 
  title = '',
  height = 300 
}) {
  const chartRef = useRef();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
  };

  const chartData = {
    labels: data?.labels || [],
    datasets: data?.datasets || [],
  };

  const ChartComponent = type === 'doughnut' ? Doughnut : Pie;

  return (
    <div style={{ height: `${height}px` }}>
      <ChartComponent
        ref={chartRef}
        data={chartData}
        options={options}
      />
    </div>
  );
}