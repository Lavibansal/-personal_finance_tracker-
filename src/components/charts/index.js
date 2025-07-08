import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import './styles.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Charts({ transactions }) {
  const [selectedChart, setSelectedChart] = useState('balance');
  const [timeRange, setTimeRange] = useState('month');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  // Helper to filter by custom date range
  const filterByCustomRange = (txs) => {
    if (!customRange.from || !customRange.to) return txs;
    const from = new Date(customRange.from);
    const to = new Date(customRange.to);
    return txs.filter(t => {
      const d = new Date(t.date);
      return d >= from && d <= to;
    });
  };

  // Process data for charts
  const chartData = useMemo(() => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return {
        balanceData: { labels: [], datasets: [] },
        incomeExpenseData: { labels: [], datasets: [] },
        categoryData: { labels: [], datasets: [] },
        monthlyData: { labels: [], datasets: [] },
        topCategories: { labels: [], datasets: [] },
        incomeSources: { labels: [], datasets: [] },
        expenseTrends: { labels: [], datasets: [] },
        sharedVsPersonal: { labels: [], datasets: [] },
        biggestTransactions: { labels: [], datasets: [] },
        customRangeData: { labels: [], datasets: [] },
      };
    }
    // Filter out malformed transactions
    const safeTransactions = transactions.filter(t => t && typeof t.amount === 'number' && t.date);
    if (safeTransactions.length === 0) {
      return {
        balanceData: { labels: [], datasets: [] },
        incomeExpenseData: { labels: [], datasets: [] },
        categoryData: { labels: [], datasets: [] },
        monthlyData: { labels: [], datasets: [] },
        topCategories: { labels: [], datasets: [] },
        incomeSources: { labels: [], datasets: [] },
        expenseTrends: { labels: [], datasets: [] },
        sharedVsPersonal: { labels: [], datasets: [] },
        biggestTransactions: { labels: [], datasets: [] },
        customRangeData: { labels: [], datasets: [] },
      };
    }

    // Filter transactions by time range
    const now = new Date();
    let filteredTransactions = safeTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      switch (timeRange) {
        case 'week':
          return (now - transactionDate) <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return (now - transactionDate) <= 30 * 24 * 60 * 60 * 1000;
        case 'year':
          return (now - transactionDate) <= 365 * 24 * 60 * 60 * 1000;
        case 'custom':
          return true; // We'll filter later
        default:
          return true;
      }
    });
    if (timeRange === 'custom') {
      filteredTransactions = filterByCustomRange(filteredTransactions);
    }

    // Balance over time data
    const balanceData = {
      labels: [],
      datasets: [{
        label: 'Balance',
        data: [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      }]
    };

    // Income vs Expense data
    const incomeExpenseData = {
      labels: ['Income', 'Expenses'],
      datasets: [{
        label: 'Amount',
        data: [0, 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 2,
        borderRadius: 8,
      }]
    };

    // Category breakdown data
    const categoryData = {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(34, 197, 94)',
          'rgb(249, 115, 22)',
        ],
        borderWidth: 2,
      }]
    };

    // Monthly breakdown data
    const monthlyData = {
      labels: [],
      datasets: [
        {
          label: 'Income',
          data: [],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          borderRadius: 4,
        },
        {
          label: 'Expenses',
          data: [],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 2,
          borderRadius: 4,
        }
      ]
    };

    // Calculate balance over time
    let runningBalance = 0;
    const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (transaction.type === 'income') {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }
      
      balanceData.labels.push(date);
      balanceData.datasets[0].data.push(runningBalance);
    });

    // Calculate income vs expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals = {};

    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += transaction.amount;
      }

      // Category breakdown
      if (!categoryTotals[transaction.tag]) {
        categoryTotals[transaction.tag] = 0;
      }
      categoryTotals[transaction.tag] += transaction.amount;
    });

    incomeExpenseData.datasets[0].data = [totalIncome, totalExpenses];

    // Category data
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8); // Top 8 categories

    categoryData.labels = sortedCategories.map(([category]) => category);
    categoryData.datasets[0].data = sortedCategories.map(([, amount]) => amount);

    // Monthly breakdown
    const monthlyTotals = {};
    filteredTransactions.forEach(transaction => {
      const month = new Date(transaction.date).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
      
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === 'income') {
        monthlyTotals[month].income += transaction.amount;
      } else {
        monthlyTotals[month].expenses += transaction.amount;
      }
    });

    const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => new Date(a) - new Date(b));
    monthlyData.labels = sortedMonths;
    monthlyData.datasets[0].data = sortedMonths.map(month => monthlyTotals[month].income);
    monthlyData.datasets[1].data = sortedMonths.map(month => monthlyTotals[month].expenses);

    // Top Spending Categories (Bar)
    const topCategories = {
      labels: [],
      datasets: [{
        label: 'Top Categories',
        data: [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
        ],
      }],
    };
    const expenseCategoryTotals = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        if (!expenseCategoryTotals[t.tag]) expenseCategoryTotals[t.tag] = 0;
        expenseCategoryTotals[t.tag] += t.amount;
      }
    });
    const sortedTopCategories = Object.entries(expenseCategoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6);
    topCategories.labels = sortedTopCategories.map(([cat]) => cat);
    topCategories.datasets[0].data = sortedTopCategories.map(([, amt]) => amt);

    // Income Sources Breakdown (Pie)
    const incomeSources = {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      }],
    };
    const incomeTagTotals = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        if (!incomeTagTotals[t.tag]) incomeTagTotals[t.tag] = 0;
        incomeTagTotals[t.tag] += t.amount;
      }
    });
    const sortedIncomeTags = Object.entries(incomeTagTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    incomeSources.labels = sortedIncomeTags.map(([tag]) => tag);
    incomeSources.datasets[0].data = sortedIncomeTags.map(([, amt]) => amt);

    // Expense Trends (Weekly/Quarterly)
    const expenseTrends = {
      labels: [],
      datasets: [{
        label: 'Expenses',
        data: [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 4,
      }],
    };
    // Weekly
    if (timeRange === 'week') {
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekTotals = Array(7).fill(0);
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const d = new Date(t.date);
          weekTotals[d.getDay()] += t.amount;
        }
      });
      expenseTrends.labels = weekDays;
      expenseTrends.datasets[0].data = weekTotals;
    }
    // Quarterly
    if (timeRange === 'year') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterTotals = [0, 0, 0, 0];
      filteredTransactions.forEach(t => {
        if (t.type === 'expense') {
          const d = new Date(t.date);
          const q = Math.floor(d.getMonth() / 3);
          quarterTotals[q] += t.amount;
        }
      });
      expenseTrends.labels = quarters;
      expenseTrends.datasets[0].data = quarterTotals;
    }

    // Shared vs Personal Expenses
    const sharedVsPersonal = {
      labels: ['Shared', 'Personal'],
      datasets: [{
        data: [0, 0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      }],
    };
    let shared = 0, personal = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        if (t.isShared) shared += t.amount;
        else personal += t.amount;
      }
    });
    sharedVsPersonal.datasets[0].data = [shared, personal];

    // Biggest Transactions
    const biggestTransactions = {
      labels: [],
      datasets: [{
        label: 'Amount',
        data: [],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
      }],
    };
    const sortedBiggest = [...filteredTransactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 5);
    biggestTransactions.labels = sortedBiggest.map(t => `${t.name || t.tag || t.type} (${t.date})`);
    biggestTransactions.datasets[0].data = sortedBiggest.map(t => t.amount);

    // Custom Date Range Analysis
    const customRangeData = {
      labels: [],
      datasets: [{
        label: 'Amount',
        data: [],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
      }],
    };
    if (timeRange === 'custom') {
      const txs = filterByCustomRange(safeTransactions);
      customRangeData.labels = txs.map(t => t.date);
      customRangeData.datasets[0].data = txs.map(t => t.amount);
    }

    return {
      balanceData,
      incomeExpenseData,
      categoryData,
      monthlyData,
      topCategories,
      incomeSources,
      expenseTrends,
      sharedVsPersonal,
      biggestTransactions,
      customRangeData,
    };
  }, [transactions, timeRange, customRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: 'var(--gray-700)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: 'var(--gray-900)',
        bodyColor: 'var(--gray-700)',
        borderColor: 'var(--gray-200)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: 'Inter, sans-serif',
          size: 14,
          weight: '600',
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 12,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: 'var(--gray-600)',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: 'var(--gray-600)',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
          callback: function(value) {
            return '₹' + value.toLocaleString();
          },
        },
      },
    },
  };

  const renderChart = () => {
    switch (selectedChart) {
      case 'balance':
        return (
          <div className="chart-container">
            <h3>Balance Over Time</h3>
            <Line data={chartData.balanceData} options={chartOptions} />
          </div>
        );
      case 'income-expense':
        return (
          <div className="chart-container">
            <h3>Income vs Expenses</h3>
            <Bar data={chartData.incomeExpenseData} options={chartOptions} />
          </div>
        );
      case 'category':
        return (
          <div className="chart-container">
            <h3>Spending by Category</h3>
            <Doughnut data={chartData.categoryData} options={chartOptions} />
          </div>
        );
      case 'monthly':
        return (
          <div className="chart-container">
            <h3>Monthly Breakdown</h3>
            <Bar data={chartData.monthlyData} options={chartOptions} />
          </div>
        );
      case 'top-categories':
        return (
          <div className="chart-container">
            <h3>Top Spending Categories</h3>
            <Bar data={chartData.topCategories} options={chartOptions} />
          </div>
        );
      case 'income-sources':
        return (
          <div className="chart-container">
            <h3>Income Sources Breakdown</h3>
            <Pie data={chartData.incomeSources} options={chartOptions} />
          </div>
        );
      case 'expense-trends':
        return (
          <div className="chart-container">
            <h3>Expense Trends</h3>
            <Bar data={chartData.expenseTrends} options={chartOptions} />
          </div>
        );
      case 'shared-vs-personal':
        return (
          <div className="chart-container">
            <h3>Shared vs Personal Expenses</h3>
            <Doughnut data={chartData.sharedVsPersonal} options={chartOptions} />
          </div>
        );
      case 'biggest-transactions':
        return (
          <div className="chart-container">
            <h3>Biggest Transactions</h3>
            <Bar data={chartData.biggestTransactions} options={chartOptions} />
          </div>
        );
      case 'custom-range':
        return (
          <div className="chart-container">
            <h3>Custom Date Range Analysis</h3>
            <Bar data={chartData.customRangeData} options={chartOptions} />
          </div>
        );
      default:
        return null;
    }
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="charts-wrapper">
        <div className="charts-header">
          <h2>Financial Analytics</h2>
          <p>No transactions available to display charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-wrapper">
      <div className="charts-header">
        <h2>Financial Analytics</h2>
        <div className="chart-controls">
          <select 
            value={selectedChart} 
            onChange={(e) => setSelectedChart(e.target.value)}
            className="chart-select"
          >
            <option value="balance">Balance Over Time</option>
            <option value="income-expense">Income vs Expenses</option>
            <option value="category">Spending by Category</option>
            <option value="monthly">Monthly Breakdown</option>
            <option value="top-categories">Top Spending Categories</option>
            <option value="income-sources">Income Sources Breakdown</option>
            <option value="expense-trends">Expense Trends</option>
            <option value="shared-vs-personal">Shared vs Personal Expenses</option>
            <option value="biggest-transactions">Biggest Transactions</option>
            <option value="custom-range">Custom Date Range Analysis</option>
          </select>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="chart-select"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>
          {timeRange === 'custom' && (
            <>
              <input
                type="date"
                value={customRange.from}
                onChange={e => setCustomRange(r => ({ ...r, from: e.target.value }))}
                className="chart-date-input"
              />
              <input
                type="date"
                value={customRange.to}
                onChange={e => setCustomRange(r => ({ ...r, to: e.target.value }))}
                className="chart-date-input"
              />
            </>
          )}
        </div>
      </div>
      
      <div className="chart-content">
        {renderChart()}
      </div>
      
      <div className="chart-summary">
        <div className="summary-card">
          <h4>Total Income</h4>
          <p className="amount positive">
            ₹{chartData.incomeExpenseData.datasets[0].data[0]?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="summary-card">
          <h4>Total Expenses</h4>
          <p className="amount negative">
            ₹{chartData.incomeExpenseData.datasets[0].data[1]?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="summary-card">
          <h4>Net Balance</h4>
          <p className={`amount ${(chartData.incomeExpenseData.datasets[0].data[0] - chartData.incomeExpenseData.datasets[0].data[1]) >= 0 ? 'positive' : 'negative'}`}>
            ₹{((chartData.incomeExpenseData.datasets[0].data[0] || 0) - (chartData.incomeExpenseData.datasets[0].data[1] || 0)).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Charts;
