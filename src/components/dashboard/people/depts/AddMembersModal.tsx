"use client"

import { useState, useMemo, useCallback } from "react";
import { Search, Users, X, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AppUser } from "@/queries/departments/get-all-departments";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";
import { logger } from "@/lib/logger";


interface MembersDropdownProps {
    selectedMembers: AppUser[];
    onMembersSelected: (members: AppUser[]) => void;
    onRemoveMember: (memberId: string) => void;
}

const MembersDropdown = ({
    selectedMembers,
    onMembersSelected,
    onRemoveMember
}: MembersDropdownProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const allUsers = useGetAllUsersApi();
    const [tempSelected, setTempSelected] = useState<AppUser[]>(selectedMembers);

    // Memoized filtered members based on search query
    const filteredMembers = useMemo(() => {
        logger.log(allUsers?.data?.data)
        if (!allUsers?.data?.data) return [];

        const users = allUsers.data.data;
        if (!searchQuery.trim()) return users;

        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLocaleLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        );
    }, [allUsers?.data?.data, searchQuery]);

    // Memoized selected member IDs for quick lookup
    const selectedMemberIds = useMemo(() =>
        new Set(tempSelected.map(member => member.userId)),
        [tempSelected]
    );

    // Event handlers with useCallback
    const handleToggleMember = useCallback((member: AppUser) => {
        setTempSelected(prev => {
            const isSelected = prev.find(m => m.userId === member.userId);
            if (isSelected) {
                return prev.filter(m => m.userId !== member.userId);
            }
            return [...prev, member];
        });
    }, []);

    const handleConfirm = useCallback(() => {
        onMembersSelected(tempSelected);
        setIsOpen(false);
        setSearchQuery("");
    }, [tempSelected, onMembersSelected]);

    const handleCancel = useCallback(() => {
        setTempSelected(selectedMembers);
        setIsOpen(false);
        setSearchQuery("");
    }, [selectedMembers]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (open) {
            setTempSelected(selectedMembers);
        } else {
            // Reset to original selection when closing without confirming
            setTempSelected(selectedMembers);
            setSearchQuery("");
        }
        setIsOpen(open);
    }, [selectedMembers]);

    const handleRemoveMember = useCallback((e: React.MouseEvent, memberId: string) => {
        e.stopPropagation();
        onRemoveMember(memberId);
    }, [onRemoveMember]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    // Memoized trigger content to prevent unnecessary re-renders
    const triggerContent = useMemo(() => (
        <div className="flex items-center gap-2 flex-wrap min-h-9">
            {selectedMembers.length > 0 ? (
                selectedMembers.map((member) => (
                    <Badge
                        key={member.userId}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1 py-1"
                    >
                        <span className="text-xs">{member.firstName}  {member.lastName}</span>
                        <button
                            type="button"
                            onClick={(e) => handleRemoveMember(e, member.userId)}
                            className="hover:bg-muted-foreground/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                            aria-label={`Remove ${member.firstName}  ${member.lastName}`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </Badge>
                ))
            ) : (
                <span className="text-muted-foreground text-sm">Select members</span>
            )}
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
        </div>
    ), [selectedMembers, handleRemoveMember]);

    return (
        <div className="space-y-2">
            <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between h-auto min-h-9 py-2 px-3 hover:bg-accent/50 transition-colors"
                        aria-label="Select team members"
                    >
                        {triggerContent}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-80 p-0"
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="p-4 border-b border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm">Add Members</h3>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="pl-9"
                                autoFocus
                                aria-label="Search members"
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-60">
                        <div className="p-2">
                            {allUsers.isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                    <p className="text-sm">Loading members...</p>
                                </div>
                            ) : filteredMembers.length > 0 ? (
                                filteredMembers.map((member) => (
                                    <MemberItem
                                        key={member.userId}
                                        member={member}
                                        isSelected={selectedMemberIds.has(member.userId)}
                                        onToggle={handleToggleMember}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">
                                        {searchQuery ? "No members found" : "No members available"}
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t border-border bg-muted/20">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                                {tempSelected.length} member{tempSelected.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={allUsers.isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleConfirm}
                                    disabled={allUsers.isLoading}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

// Memoized member item component to prevent unnecessary re-renders
interface MemberItemProps {
    member: AppUser;
    isSelected: boolean;
    onToggle: (member: AppUser) => void;
}

const MemberItem = ({ member, isSelected, onToggle }: MemberItemProps) => {
    const handleClick = useCallback(() => {
        onToggle(member);
    }, [member, onToggle]);

    const handleCheckboxChange = useCallback(() => {
        onToggle(member);
    }, [member, onToggle]);

    const initials = useMemo(() =>
        [member.firstName[0], member.lastName[0]].map(n => n[0]).join("").toUpperCase(),
        [member.firstName, member.lastName]
    );

    return (
        <div
            className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            aria-pressed={isSelected}
        >
            <div className="flex items-center space-x-2 flex-1">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={handleCheckboxChange}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${member.firstName}  ${member.lastName}`}
                />
                <Avatar className="w-8 h-8">
                    <AvatarImage alt={member.lastName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {initials}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.firstName}  {member.lastName}</p>
                </div>
                {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                )}
            </div>
        </div>
    );
};

export default MembersDropdown;
