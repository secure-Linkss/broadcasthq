"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const data = [
  { date: "May 1", sent: 12000, read: 8400 },
  { date: "May 5", sent: 15000, read: 10500 },
  { date: "May 10", sent: 18000, read: 13000 },
  { date: "May 15", sent: 14000, read: 10000 },
  { date: "May 20", sent: 22000, read: 16000 },
  { date: "May 25", sent: 28000, read: 21000 },
  { date: "May 30", sent: 32000, read: 25000 },
];

export function PerformanceChart() {
  return (
    <Card className="col-span-4 bg-card">
      <CardHeader>
        <CardTitle>Message Performance</CardTitle>
        <CardDescription>30-day volume and read engagement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
              <Area type="monotone" dataKey="read" stroke="hsl(var(--secondary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRead)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
