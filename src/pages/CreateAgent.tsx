import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateGallery } from '@/components/AIAgents/TemplateGallery';
import { ConfigurationStudio } from '@/components/AIAgents/ConfigurationStudio';
import { AgentTemplate } from '@/types/agent';

type Step = 'select' | 'configure';

const CreateAgent = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  const handleTemplateSelect = (template: AgentTemplate | null) => {
    setSelectedTemplate(template);
  };

  const handleContinue = () => {
    setStep('configure');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {step === 'select' ? (
        <>
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ai-agents')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Create New Agent</h1>
              <p className="text-muted-foreground">Step 1 of 2: Select a blueprint</p>
            </div>
          </div>

          <TemplateGallery 
            onSelect={handleTemplateSelect} 
            selectedTemplate={selectedTemplate} 
          />

          <div className="flex justify-end mt-8 pt-4 border-t">
            <Button onClick={handleContinue}>
              Continue to Configuration
            </Button>
          </div>
        </>
      ) : (
        <ConfigurationStudio 
          template={selectedTemplate} 
          onBack={() => setStep('select')} 
        />
      )}
    </div>
  );
};

export default CreateAgent;
