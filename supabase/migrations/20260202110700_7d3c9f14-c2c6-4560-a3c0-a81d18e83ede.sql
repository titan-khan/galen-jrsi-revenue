-- Create assistant_conversations table
CREATE TABLE public.assistant_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assistant_messages table
CREATE TABLE public.assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_assistant_messages_conversation_id ON public.assistant_messages(conversation_id);
CREATE INDEX idx_assistant_conversations_updated_at ON public.assistant_conversations(updated_at DESC);

-- Enable RLS
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_conversations (public access like other tables)
CREATE POLICY "Allow public read on assistant_conversations" 
ON public.assistant_conversations FOR SELECT USING (true);

CREATE POLICY "Allow public insert on assistant_conversations" 
ON public.assistant_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on assistant_conversations" 
ON public.assistant_conversations FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on assistant_conversations" 
ON public.assistant_conversations FOR DELETE USING (true);

-- RLS Policies for assistant_messages (public access like other tables)
CREATE POLICY "Allow public read on assistant_messages" 
ON public.assistant_messages FOR SELECT USING (true);

CREATE POLICY "Allow public insert on assistant_messages" 
ON public.assistant_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on assistant_messages" 
ON public.assistant_messages FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on assistant_messages" 
ON public.assistant_messages FOR DELETE USING (true);

-- Trigger to update updated_at on conversations
CREATE TRIGGER update_assistant_conversations_updated_at
BEFORE UPDATE ON public.assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on messages
CREATE TRIGGER update_assistant_messages_updated_at
BEFORE UPDATE ON public.assistant_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();