 import { memo } from 'react';
 import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { TrendingUp, TrendingDown } from 'lucide-react';
 import type { NPSTrendPoint } from '@/types/specialist';
 import { cn } from '@/lib/utils';
 
 interface NPSTrendChartProps {
   data: NPSTrendPoint[];
   target?: number;
 }
 
 const formatMonth = (period: string) => {
   const [year, month] = period.split('-');
   const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
 };
 
 export const NPSTrendChart = memo(function NPSTrendChart({ data, target = 50 }: NPSTrendChartProps) {
   const currentNps = data[data.length - 1]?.nps ?? 0;
   const previousNps = data[data.length - 2]?.nps ?? 0;
   const delta = currentNps - previousNps;
   const minNps = Math.min(...data.map(d => d.nps));
   const maxNps = Math.max(...data.map(d => d.nps));
   const avgNps = data.reduce((sum, d) => sum + d.nps, 0) / data.length;
 
   const chartData = data.map(d => ({
     ...d,
     periodLabel: formatMonth(d.period),
   }));
 
   return (
     <Card>
       <CardHeader className="pb-2">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base">13-Month NPS Trend</CardTitle>
           <div className="flex items-center gap-2">
             <Badge variant="outline" className="gap-1">
               {delta >= 0 ? (
                 <TrendingUp className="h-3 w-3 text-emerald-500" />
               ) : (
                 <TrendingDown className="h-3 w-3 text-red-500" />
               )}
               <span className={cn(
                 delta >= 0 ? "text-emerald-600" : "text-red-600"
               )}>
                 {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pts
               </span>
             </Badge>
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <div className="h-[220px] w-full">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
               <XAxis 
                 dataKey="periodLabel" 
                 fontSize={10}
                 tickLine={false}
                 axisLine={false}
                 className="fill-muted-foreground"
               />
               <YAxis 
                 fontSize={10}
                 tickLine={false}
                 axisLine={false}
                 className="fill-muted-foreground"
                 domain={[0, Math.max(50, maxNps + 10)]}
               />
               <Tooltip 
                 contentStyle={{
                   backgroundColor: 'hsl(var(--card))',
                   border: '1px solid hsl(var(--border))',
                   borderRadius: '8px',
                   fontSize: '12px',
                 }}
                 formatter={(value: number) => [`${value.toFixed(1)}`, 'NPS']}
               />
               <ReferenceLine 
                 y={target} 
                 stroke="hsl(var(--primary))" 
                 strokeDasharray="5 5" 
                 label={{ value: `Target: ${target}`, fontSize: 10, fill: 'hsl(var(--primary))' }}
               />
               <ReferenceLine 
                 y={avgNps} 
                 stroke="hsl(var(--muted-foreground))" 
                 strokeDasharray="3 3" 
               />
               <Line 
                 type="monotone" 
                 dataKey="nps" 
                 stroke="hsl(var(--primary))" 
                 strokeWidth={2}
                 dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                 activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
               />
             </LineChart>
           </ResponsiveContainer>
         </div>
         <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
           <span>Average: <span className="font-medium text-foreground">{avgNps.toFixed(1)}</span></span>
           <span>Range: <span className="font-medium text-foreground">{minNps.toFixed(1)} - {maxNps.toFixed(1)}</span> ({(maxNps - minNps).toFixed(1)} pt swing)</span>
         </div>
       </CardContent>
     </Card>
   );
 });