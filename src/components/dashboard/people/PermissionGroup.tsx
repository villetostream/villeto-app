import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Permission } from "@/queries/auth/auth-permissions";



interface PermissionGroupProps {
    name: string;
    permissions: Permission[];
    onPermissionToggle: (permissionId: string) => void;
}

export const PermissionGroup = ({ name, permissions, onPermissionToggle }: PermissionGroupProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full bg-muted/50 rounded-lg p-4 flex items-center justify-between hover:bg-muted/70 transition-colors">
                <span className="font-medium">{name}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="space-y-3 px-4 border-l-2 border-border ml-4 mt-2">
                    {permissions.map((permission) => (
                        <div
                            key={permission.name}
                            className="flex items-center justify-between "
                        >
                            <div>
                                <p className="font-medium text-sm">{permission.name}</p>

                            </div>
                            <Switch
                                checked={permission.enabled}
                                onCheckedChange={() => onPermissionToggle(permission.permissionId)}
                            />
                        </div>
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};