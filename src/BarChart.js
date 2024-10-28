import { useState, useEffect } from 'react';
import Select from 'react-select'; // Import the Select component from react-select
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, Legend } from 'recharts';
import Papa from 'papaparse';
import './BarChart.css';

const lineColors = {
    "Blue Mountains Line": "#1f77b4",
    "Carlingford replacement buses": "#ff7f0e",
    "Central Coast & Newcastle Line": "#2ca02c",
    "Hunter Line": "#d62728",
    "NSW TrainLink Southern Train Services": "#9467bd",
    "NSW TrainLink Western Train Services": "#8c564b",
    "North Coast NSW": "#e377c2",
    "North West NSW": "#7f7f7f",
    "South Coast Line": "#bcbd22",
    "Southern Highlands Line": "#17becf",
    "T1 North Shore Line & T1 Western Line": "#393b79",
    "T2 Inner West & Leppington Line": "#637939",
    "T3 Bankstown Line": "#8c6d31",
    "T4 Eastern Suburbs & Illawarra Line": "#e6550d",
    "T5 Cumberland Line": "#fdae6b",
    "T7 Olympic Park Line": "#31a354",
    "T8 Airport & South Line": "#756bb1",
    "T9 Northern Line": "#9c9ede",
    "Western NSW": "#d6616b"
};

const CsvChart = () => {
    const [data, setData] = useState([]);
    const [filteredTXData, setFilteredTXData] = useState([]);
    const [filteredRegionalData, setFilteredRegionalData] = useState([]);
    const [chartType, setChartType] = useState('bar');
    const [peakTimesTX, setPeakTimesTX] = useState({});
    const [peakTimesRegional, setPeakTimesRegional] = useState({});
    const [showPeakTimes, setShowPeakTimes] = useState(false); // State to manage visibility of peak times
    const [selectedLines, setSelectedLines] = useState([]); // New state for selected lines

    const s3Url = 'https://devops-widget-wsu-2024.s3.ap-southeast-2.amazonaws.com/traintimes.csv';

    // Fetch CSV data from S3
    useEffect(() => {
        fetch(s3Url)
            .then(response => response.text())
            .then(csvData => {
                Papa.parse(csvData, {
                    header: true,
                    complete: (result) => {
                        setData(result.data);
                    },
                });
            })
            .catch(error => console.error('Error fetching the CSV file:', error));
    }, []);

    // Options for the line dropdown
    const lineOptions = Object.keys(lineColors).map(line => ({
        value: line,
        label: line,
    }));

    // Define custom styles for the react-select component
    const customStyles = {
        control: (provided) => ({
            ...provided,
            width: '100%', // Fixed width for the dropdown menu
        }),
        option: (provided, { data }) => ({
            ...provided,
            color: lineColors[data.value] || 'black', // Use color from lineColors or default to black
            backgroundColor: 'white', // Keep background white for readability
        }),
        multiValue: (provided, { data }) => ({
            ...provided,
            backgroundColor: lineColors[data.value] || '#e0e0e0', // Background color for selected items
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: 'black', // Text color of selected items
        }),
    };

    // Update selected lines
    const handleLineSelection = (selectedOptions) => {
        setSelectedLines(selectedOptions ? selectedOptions.map(option => option.value) : []);
    };


    // Group data by line and hour
    const groupDataByLineAndHour = (filteredData) => {
        const groupedData = filteredData.reduce((acc, curr) => {
            const line = curr.Line;
            const trips = parseInt(curr.Trip) || 0;
            const timestamp = curr.Timestamp.slice(0, 13); // Extract date and hour (YYYY-MM-DDTHH)

            if (acc[line]) {
                if (acc[line][timestamp]) {
                    acc[line][timestamp] += trips;
                } else {
                    acc[line][timestamp] = trips;
                }
            } else {
                acc[line] = { Line: line, [timestamp]: trips };
            }

            return acc;
        }, {});

        return Object.values(groupedData);
    };

    // Calculate peak times
    const calculatePeakTimes = (filteredData) => {
        const peakTimes = {};

        filteredData.forEach((item) => {
            const line = item.Line;

            Object.keys(item).forEach((timestamp) => {
                if (timestamp !== 'Line') {
                    const trips = item[timestamp];

                    if (!peakTimes[line] || trips > peakTimes[line].trips) {
                        peakTimes[line] = {
                            hour: timestamp.slice(11, 13), // Extract hour from timestamp
                            trips: trips,
                        };
                    }
                }
            });
        });

        return peakTimes;
    };

    // Separate TX lines and regional lines
    const separateTXAndRegional = (filteredData) => {
        const TXLines = filteredData.filter(item => item.Line && item.Line.startsWith('T'));
        const regionalLines = filteredData.filter(item => item.Line && !item.Line.startsWith('T'));

        const groupedTX = groupDataByLineAndHour(TXLines);
        const groupedRegional = groupDataByLineAndHour(regionalLines);

        setFilteredTXData(groupedTX);
        setFilteredRegionalData(groupedRegional);

        // Calculate peak times
        const peakTimesTX = calculatePeakTimes(groupedTX);
        const peakTimesRegional = calculatePeakTimes(groupedRegional);

        setPeakTimesTX(peakTimesTX);
        setPeakTimesRegional(peakTimesRegional);
    };

    // Use full dataset for rendering charts
    useEffect(() => {
        separateTXAndRegional(data);
    }, [data]);

    // Prepare data for Line Charts with hourly grouping
    const prepareLineChartData = (lines) => {
        const groupedData = {};

        data.forEach((item) => {
            const line = item.Line;
            if (!lines.includes(line)) return; // Only process lines that match

            const timestamp = item.Timestamp.slice(0, 13); // Extract hour part (YYYY-MM-DDTHH)
            const trips = parseInt(item.Trip) || 0;

            if (!groupedData[line]) {
                groupedData[line] = {};
            }

            if (!groupedData[line][timestamp]) {
                groupedData[line][timestamp] = 0;
            }

            groupedData[line][timestamp] += trips;
        });

        const allTimestamps = [...new Set(data.map(item => item.Timestamp.slice(0, 13)))]; // Unique hours
        const formattedData = allTimestamps.map(timestamp => {
            const dataPoint = { Timestamp: timestamp };
            lines.forEach(line => {
                dataPoint[line] = groupedData[line]?.[timestamp] || 0;
            });
            return dataPoint;
        });

        return formattedData;
    };

    // Toggle between Bar and Line chart
    const toggleChartType = () => {
        setChartType(chartType === 'bar' ? 'line' : 'bar');
    };

    const togglePeakTimes = () => {
        setShowPeakTimes(prevShowPeakTimes => !prevShowPeakTimes);
    };

    // Aggregate data for bar charts (total trips per line)
    const prepareBarChartData = (filteredData) => {
        return filteredData.map((item) => {
            // For each line, sum up all trips across all timestamps
            const totalTrips = Object.keys(item)
                .filter(key => key !== 'Line')  // Exclude the 'Line' key
                .reduce((sum, timestamp) => sum + item[timestamp], 0);

            return {
                Line: item.Line,
                Trip: totalTrips,
            };
        });
    };




    const renderChart = (data, title, lines) => {
        const filteredLines = lines.filter(line => selectedLines.includes(line)); // Filter by selected lines
        if (chartType === 'bar') {
            const barData = prepareBarChartData(data.filter(item => selectedLines.includes(item.Line)));
            return (
                <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="Line" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="Trip" isAnimationActive={false}>
                            {barData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={lineColors[entry.Line] || '#82ca9d'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        } else {
            const lineData = prepareLineChartData(filteredLines);
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="Timestamp" angle={-45} textAnchor="end" interval={5} tickFormatter={(tick) => `${tick.slice(11, 13)}:00`} tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 10, fontSize: '12px' }} />
                        {filteredLines.map((lineName, index) => (
                            <Line key={index} type="monotone" dataKey={lineName} stroke={lineColors[lineName]} name={lineName} dot={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            );
        }
    };

    // Peak Times Display with selected lines
    const renderPeakTimes = () => (
        <div className="peak-times-container">
            <h3>Peak Trip Times</h3>
            <h4>Sydney Lines</h4>
            <div className="peak-times-grid">
                {Object.keys(peakTimesTX)
                    .filter(line => selectedLines.includes(line))
                    .map(line => (
                        <div className="peak-times-item" key={line} style={{ borderColor: lineColors[line] }}>
                            <div className="peak-times-line" style={{ color: lineColors[line] }}>{line}</div>
                            <div className="peak-times-trips">
                                {peakTimesTX[line].hour}:00 (Trips: {peakTimesTX[line].trips})
                            </div>
                        </div>
                    ))}
            </div>
            <h4>Regional Lines</h4>
            <div className="peak-times-grid">
                {Object.keys(peakTimesRegional)
                    .filter(line => selectedLines.includes(line))
                    .map(line => (
                        <div className="peak-times-item" key={line} style={{ borderColor: lineColors[line] }}>
                            <div className="peak-times-line" style={{ color: lineColors[line] }}>{line}</div>
                            <div className="peak-times-trips">
                                {peakTimesRegional[line].hour}:00 (Trips: {peakTimesRegional[line].trips})
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );


    return (
        <div className="csv-chart-container">
            <h2>Trips by Line</h2>
            <Select
                isMulti
                options={lineOptions}
                onChange={handleLineSelection}
                placeholder="Select lines to display"
                styles={customStyles}
                className="multi-select-dropdown"
            />

            {/* Only render buttons and charts if selectedLines is not empty */}
            {selectedLines.length > 0 ? (
                <>
                    {/* Toggle chart type button */}
                    <div>
                        <button onClick={toggleChartType}>
                            Toggle to {chartType === 'bar' ? 'Line Chart' : 'Bar Chart'}
                        </button>
                    </div>

                    <div className="charts-container">
                        <div className="chart-wrapper">
                            <h3>Trips by Selected Sydney Lines</h3>
                            {renderChart(filteredTXData, 'Trips by Sydney Lines', Object.keys(lineColors).filter(line => line.startsWith('T')))}
                        </div>
                        <div className="chart-wrapper">
                            <h3>Trips by Selected Regional Lines</h3>
                            {renderChart(filteredRegionalData, 'Trips by Regional Lines', Object.keys(lineColors).filter(line => !line.startsWith('T')))}
                        </div>
                    </div>

                    <div>
                        <button onClick={togglePeakTimes} className="toggle-peak-times-btn">
                            {showPeakTimes ? 'Hide Peak Times' : 'Show Peak Times'}
                        </button>
                    </div>

                    {showPeakTimes && renderPeakTimes()}
                </>
            ) : (
                <div>
                    <p>Please select at least one line to display the charts and peak times.</p>
                </div>
            )}
        </div>
    );
};

export default CsvChart;
