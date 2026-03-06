import { useState, useEffect } from 'react';

/**
 * SubmissionHeatmap — GitHub-style activity calendar showing submission frequency
 * Light green to dark green based on daily submission count.
 */
const DAYS_IN_YEAR = 365;
const COLS = 53; // weeks

function getColor(count) {
  if (count === 0) return '#161b22';
  if (count === 1) return '#0e4429';
  if (count === 2) return '#006d32';
  if (count === 3) return '#26a641';
  return '#39d353';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LABEL = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function SubmissionHeatmap({ heatmapData = [], isLoading = false }) {
  const [data, setData] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    // Generate the last 150 days grid
    const today = new Date();
    const newData = [];
    
    // Create a quick lookup map from the passed heatmapData array: { "YYYY-MM-DD": count }
    const activityMap = {};
    heatmapData.forEach(day => {
      activityMap[day.date] = day.count;
    });

    for (let i = 150; i >= 0; i--) { // Generates 151 days of data
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const count = activityMap[dateString] || 0;
      
      newData.push({
        date: dateString,
        count: count
      });
    }
    setData(newData);
  }, [heatmapData]);

  const totalSubmissions = data.reduce((a, b) => a + b.count, 0);
  const activeDays = data.filter(d => d.count > 0).length;

  // Pad to full 53-week grid (or appropriate for 151 days)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const paddingEnd = 6 - dayOfWeek;
  // Adjust cells to use the new data structure and length (151 days)
  const cells = [...data.map(d => d.count), ...Array(paddingEnd).fill(-1)]; // -1 = future padding

  // Build weeks (columns of 7)
  // The number of columns will be based on the actual data length (151 days + padding)
  const numDaysInGrid = data.length + paddingEnd;
  const actualCols = Math.ceil(numDaysInGrid / 7);
  const weeks = [];
  for (let w = 0; w < actualCols; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Month labels: find which column each month starts at
  const monthLabels = [];
  let d = new Date();
  d.setDate(d.getDate() - (data.length - 1)); // Start from the earliest day in the data
  let lastMonth = -1;
  for (let i = 0; i < actualCols; i++) { // Iterate through actual columns
    const currentWeekStartDate = new Date(d.getTime() + i * 7 * 86400000);
    const m = currentWeekStartDate.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: i, label: MONTHS[m] });
      lastMonth = m;
    }
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11l3 3L22 4M16 4a9 9 0 11-9 9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Submission Activity
              {isLoading && <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin ml-2" />}
            </h2>
            <div className="text-[10px] text-slate-500 mt-0.5">{activeDays} active days in the last 150 days</div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-xl font-black text-white">{isLoading ? '...' : totalSubmissions}</div>
          <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-0.5">Total Submissions</div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto pb-1">
        <div style={{ display: 'grid', gridTemplateRows: 'auto', width: 'max-content' }}>
          {/* Month labels row */}
          <div className="flex mb-1 ml-7">
            {monthLabels.map(({ col, label }, i) => (
              <div key={i} style={{ gridColumn: col + 1, marginLeft: i === 0 ? col * 13 : (col - (monthLabels[i-1]?.col || 0)) * 13 - label.length * 4 }}
                className="text-[9px] text-slate-600 font-medium whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1 pt-0.5">
              {DAYS_LABEL.map((d, i) => (
                <div key={i} className="text-[8px] text-slate-700 h-[11px] leading-[11px] text-right pr-1 w-5">{d}</div>
              ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((count, di) => (
                  <div
                    key={di}
                    title={count >= 0 ? `${count} submission${count !== 1 ? 's' : ''}` : ''}
                    className="w-[11px] h-[11px] rounded-[2px] transition-transform hover:scale-125 cursor-default"
                    style={{ backgroundColor: count < 0 ? 'transparent' : getColor(count) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[9px] text-slate-600">Less</span>
        {[0, 1, 2, 3, 4].map(v => (
          <div key={v} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: getColor(v) }} />
        ))}
        <span className="text-[9px] text-slate-600">More</span>
      </div>
    </div>
  );
}
