import { ResponsiveContainer, Area, AreaChart, XAxis, YAxis, Tooltip, ReferenceDot } from "recharts";

interface SparklineChartProps {
  cumulative?: boolean;
}

const generateData = (cumulative: boolean) => {
  const base = [
    { day: "Nov 1", value: 1200 },
    { day: "Nov 4", value: 2800 },
    { day: "Nov 7", value: 4100 },
    { day: "Nov 10", value: 5200 },
    { day: "Nov 13", value: 6800 },
    { day: "Nov 16", value: 8500 },
    { day: "Nov 19", value: 10200 },
    { day: "Nov 22", value: 13900 },
    { day: "Nov 25", value: 12100 },
    { day: "Nov 28", value: 11800 },
    { day: "Nov 30", value: 12500 },
  ];

  if (cumulative) {
    let total = 0;
    return base.map((item) => {
      total += item.value;
      return { ...item, value: total };
    });
  }

  return base;
};

const formatYAxis = (value: number) => {
  if (value === 0) return "0";
  return `${(value / 1000).toFixed(1)}k`;
};

const SparklineChart = ({ cumulative = false }: SparklineChartProps) => {
  const data = generateData(cumulative);
  const maxValue = Math.max(...data.map(d => d.value));
  const currentPoint = data[7]; // Nov 22 is the "current" highlighted point

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickMargin={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatYAxis}
            domain={[0, maxValue * 1.1]}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            formatter={(value: number) => [`${(value / 1000).toFixed(1)}k`, "Value"]}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2.5}
            fill="url(#colorValue)"
          />
          <ReferenceDot
            x={currentPoint.day}
            y={currentPoint.value}
            r={6}
            fill="hsl(217, 91%, 60%)"
            stroke="white"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart;
