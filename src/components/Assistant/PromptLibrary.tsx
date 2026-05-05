import { Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { promptLibrary } from '@/data/assistantPrompts';

interface PromptLibraryProps {
  onSelectPrompt: (prompt: string) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Library className="h-4 w-4" />
          Prompt Library
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Prompt Library</SheetTitle>
          <SheetDescription>
            Pre-built prompts to help you get started. Click any prompt to use it.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
          <div className="space-y-6">
            {promptLibrary.map((category) => (
              <div key={category.name}>
                <h3 className="font-semibold text-sm text-foreground mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.prompts.map((prompt) => (
                    <button
                      key={prompt.title}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-colors"
                      onClick={() => onSelectPrompt(prompt.prompt)}
                    >
                      <p className="font-medium text-sm text-foreground">
                        {prompt.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {prompt.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
