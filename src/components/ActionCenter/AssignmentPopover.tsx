import { useState } from "react";
import { Check, ChevronsUpDown, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Assignee, DEMO_TEAM_MEMBERS } from "@/types/actionCenter";

interface AssignmentPopoverProps {
  currentAssignee?: string;
  onAssign: (assignee: Assignee) => void;
}

export function AssignmentPopover({ currentAssignee, onAssign }: AssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Assignee | null>(
    DEMO_TEAM_MEMBERS.find(m => m.name === currentAssignee) || null
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
        >
          {selectedMember ? (
            <>
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {getInitials(selectedMember.name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-20 truncate">{selectedMember.name.split(' ')[0]}</span>
            </>
          ) : (
            <>
              <User className="h-3 w-3" />
              Assign
            </>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team..." className="h-8" />
          <CommandList>
            <CommandEmpty>No team member found.</CommandEmpty>
            <CommandGroup>
              {DEMO_TEAM_MEMBERS.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => {
                    setSelectedMember(member);
                    onAssign(member);
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-muted">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-xs">{member.name}</span>
                  <Check
                    className={cn(
                      "h-3 w-3",
                      selectedMember?.id === member.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
