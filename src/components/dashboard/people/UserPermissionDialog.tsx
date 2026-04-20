import { useState } from "react";
import { X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Permission } from "@/actions/auth/auth-permissions";

interface UserPermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
}



export function UserPermissionsDialog({
    open,
    onOpenChange,
    userId,
}: UserPermissionsDialogProps) {
    const [permissions, setPermissions] = useState<Permission[]>([

    ]);

    const togglePermission = (id: string) => {
        setPermissions((prev) =>
            prev.map((p) => (p.permissionId === id ? { ...p, enabled: !p.enabled } : p))
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>User Permissions</DialogTitle>

                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Manage what each role can view, create, edit, and approve across Villeto.
                    </DialogDescription>
                </DialogHeader>

                <div className="gap-4 grid h-full overflow-y-auto">
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback>SC</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-medium">Sarah Chen</p>
                            <p className="text-sm text-muted-foreground">Sarahchen@gmail.com</p>
                            <p className="text-sm text-muted-foreground">Finance Manager</p>
                        </div>
                        <Badge className="bg-green-50 text-green-700">Active</Badge>
                    </div>

                    <div className="space-y-4">
                        {permissions.map((permission) => (
                            <div key={permission.permissionId} className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="font-medium">{permission.name}</p>
                                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                                </div>
                                <Switch
                                    checked={permission.enabled}
                                    onCheckedChange={() => togglePermission(permission.permissionId)}
                                />
                            </div>
                        ))}
                    </div>

                    <Button className="w-full bg-primary hover:bg-primary/90">
                        Save Permissions
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}