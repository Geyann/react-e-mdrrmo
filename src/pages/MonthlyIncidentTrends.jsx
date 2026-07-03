import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient'; 

const YearlyProgressionDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    mostFrequent: 'N/A',
    peekYear: 'N/A',
    highPriorityCount: 0
  });

  const yearKeys = ['y2023', 'y2024', 'y2025', 'y2026'];

  // Categories and dbType matching your exact form selection values
  const [categories, setCategories] = useState({
    operational: [
      { name: 'Medical Emergency', dbType: 'Medical Emergency', y2023: 0, y2024: 0, y2025: 0, y2026: 0, summary: '(This column will show the summary trends for Medical Emergency.)' },
      { name: 'Fire', dbType: 'Fire', y2023: 0, y2024: 0, y2025: 0, y2026: 0, summary: '(This column will show the summary trends for Fire Incidents.)' },
      { name: 'Accident', dbType: 'Accident', y2023: 0, y2024: 0, y2025: 0, y2026: 0, summary: '(This column will show the summary trends for Accidents.)' },
      { name: 'Natural Disaster', dbType: 'Natural Disaster', y2023: 0, y2024: 0, y2025: 0, y2026: 0, summary: '(This column will show the summary trends for Incident cause from Natural disaster.)' }
    ]
  });

  useEffect(() => {
    const fetchYearlyData = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('reportIncident')
          .select('*');

        if (error) throw error;

        let total = data.length;
        let highPriority = 0;
        let yearCounts = { '2023': 0, '2024': 0, '2025': 0, '2026': 0 };
        let typeCounts = {};

        const updatedCategories = JSON.parse(JSON.stringify(categories));

        data.forEach(incident => {
          // Track high/critical incident counts
          if (incident.priorityLevel === 'High' || incident.priorityLevel === 'Critical') {
            highPriority++;
          }

          if (incident.date) {
            // Extract the year component directly from your date string
            const incidentYear = incident.date.split('-')[0]; 
            const targetKey = `y${incidentYear}`;

            if (yearCounts[incidentYear] !== undefined) {
              yearCounts[incidentYear]++;
            }

            const type = incident.incidentType || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;

            // Map values dynamically using strict form string configuration checks
            Object.keys(updatedCategories).forEach(catGroup => {
              updatedCategories[catGroup].forEach(row => {
                if (row.dbType.trim().toLowerCase() === type.trim().toLowerCase() && row[targetKey] !== undefined) {
                  row[targetKey]++;
                }
              });
            });
          }
        });

        const topYear = Object.keys(yearCounts).reduce((a, b) => yearCounts[a] > yearCounts[b] ? a : b, '2025');
        const topIncident = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b, 'N/A');

        setStats({
          totalIncidents: total,
          mostFrequent: topIncident.toUpperCase(),
          peekYear: topYear,
          highPriorityCount: highPriority
        });

        setCategories(updatedCategories);
      } catch (err) {
        console.error('Dashboard pipeline synchronization error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchYearlyData();
  }, []);

  const getYearTotal = (yKey) => {
    let sum = 0;
    Object.values(categories).forEach(group => {
      group.forEach(row => { sum += row[yKey]; });
    });
    return sum;
  };

  if (loading) return <div className="p-8 text-center">Syncing dashboard data with input forms...</div>;

  return (
    <div className="dashboard-page-container">
      <div className="dashboard-paper">
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <h1 className="dashboard-main-title">MDRRMO Naic Yearly Incident Trend Dashboard</h1>
          <p className="dashboard-sub-title">Tracking and analysis of disaster and emergency response operations.</p>
          <p className="dashboard-period-meta">Reporting period: Historical Timeline (Form-Synced Categories)</p>
          <hr className="dashboard-divider" />
        </div>

        <div className="stats-block-grid">
          <div style={{ backgroundColor: '#1d4ed8' }} className="stat-card">
            <span className="stat-card-label">TOTAL<br/>INCIDENTS</span>
            <span className="stat-card-value large">{stats.totalIncidents}</span>
          </div>
          <div style={{ backgroundColor: '#f59e0b' }} className="stat-card">
            <span className="stat-card-label">MOST<br/>FREQUENT</span>
            <span className="stat-card-value small-text">{stats.mostFrequent}</span>
          </div>
          <div style={{ backgroundColor: '#ef4444' }} className="stat-card">
            <span className="stat-card-label">PEAK<br/>YEAR</span>
            <span className="stat-card-value medium">{stats.peekYear}</span>
          </div>
          <div style={{ backgroundColor: '#10b981' }} className="stat-card">
            <span className="stat-card-label">HIGH<br/>PRIORITY</span>
            <span className="stat-card-value large">{stats.highPriorityCount}</span>
          </div>
        </div>

        <div className="matrix-wrapper">
          <table className="matrix-table">
            <thead>
              <tr className="table-header-row">
                <th className="table-th category-col">INCIDENT CATEGORY</th>
                <th className="table-th incidents-col">
                  <div style={{ paddingBottom: '0.25rem' }}>YEARLY INCIDENTS</div>
                  <div className="week-split-header">
                    <span>2022</span><span>2023</span><span>2024</span><span>2025</span>
                  </div>
                </th>
                <th className="table-th summary-col">TREND SUMMARY</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categories).map(([groupKey, rows]) => {
                return (
                  <React.Fragment key={groupKey}>
                    <tr className="category-band-row">
                      <td colSpan="3" className="category-band-td">I. Logged Emergency Classifications</td>
                    </tr>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="matrix-data-row">
                        <td className="category-name-td">{row.name}</td>
                        <td className="weekly-split-cells-td">
                          <div className="week-grid-values">
                            <span>{row.y2023}</span>
                            <span>{row.y2024}</span>
                            <span>{row.y2025}</span>
                            <span>{row.y2026}</span>
                          </div>
                        </td>
                        <td className="summary-text-td">{row.summary}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              <tr className="table-footer-ribbon">
                <td className="footer-label-td">TOTALS</td>
                <td className="footer-weeks-total-td">
                  <div className="week-grid-values" style={{ color: '#ffffff' }}>
                    <span>{getYearTotal('y2023')}</span>
                    <span>{getYearTotal('y2024')}</span>
                    <span>{getYearTotal('y2025')}</span>
                    <span>{getYearTotal('y2026')}</span>
                  </div>
                </td>
                <td className="footer-total-final-td" style={{ textAlign: 'right' }}>Total: {stats.totalIncidents} Incidents</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default YearlyProgressionDashboard;