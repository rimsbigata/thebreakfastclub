
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Timer, DoorOpen, Activity } from "lucide-react";

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue: string;
  color: string;
}

function StatItem({ icon: Icon, label, value, subValue, color }: StatItemProps) {
  return (
    <Card className="bg-background">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold">{value}</h3>
            <span className="text-xs font-medium text-muted-foreground">{subValue}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CourtStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatItem 
        icon={Users} 
        label="Total Players" 
        value="24" 
        subValue="+4 today" 
        color="bg-blue-500" 
      />
      <StatItem 
        icon={Timer} 
        label="Avg. Wait Time" 
        value="15m" 
        subValue="-2m since 8 AM" 
        color="bg-primary" 
      />
      <StatItem 
        icon={DoorOpen} 
        label="Available Courts" 
        value="3" 
        subValue="of 8 total" 
        color="bg-green-500" 
      />
      <StatItem 
        icon={Activity} 
        label="Queue Size" 
        value="12" 
        subValue="Active teams" 
        color="bg-orange-500" 
      />
    </div>
  );
}
