import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";

const activities: Array<{
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
}> = [];

export const RecentActivity = () => {
  return (
    <Card className="p-6 rounded-[14px] border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold leading-[100%]">
            Recent Activity
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            Your recent significant system actions
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        // Previously rendered nothing here — an empty space below
        // the header with no indication whether activity exists and
        // hasn't loaded, or whether there's genuinely none yet.
        <EmptyState
          icon={<Activity className="w-5 h-5" aria-hidden="true" />}
          title="No recent activity"
          description="Actions like approvals and submissions will show up here."
          className="py-8"
        />
      ) : (
        <div className="space-y-3.5">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0" aria-hidden="true">
                <activity.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-medium text-sm leading-[125%]">
                  {activity.title}
                </p>
                <p className="text-[10px] leading-[125%] text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <Button
          variant={"link"}
          size={"sm"}
          className="w-full text-xs leading-[125%] text-primary hover:underline p-0! mt-4"
        >
          See all
        </Button>
      )}
    </Card>
  );
};
