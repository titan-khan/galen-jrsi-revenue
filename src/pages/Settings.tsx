import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, Target, Brain, Link2, Database, ArrowRight } from "lucide-react";
import { BusinessProfileSection } from "@/components/Settings/BusinessProfileSection";
import { StrategicContextSection } from "@/components/Settings/StrategicContextSection";
import { MetricIntelligenceSection } from "@/components/Settings/MetricIntelligenceSection";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your business context to get smarter metric recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Strategic Context</span>
            <span className="sm:hidden">Strategy</span>
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Metric Intelligence</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <BusinessProfileSection />
        </TabsContent>

        <TabsContent value="strategy">
          <StrategicContextSection />
        </TabsContent>

        <TabsContent value="intelligence">
          <MetricIntelligenceSection />
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Data Integrations</CardTitle>
              <CardDescription>
                Connect your data sources and external tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                Manage your data connectors, upload files, and configure data source integrations.
              </p>
              <Button
                className="gap-2"
                onClick={() => navigate('/data-connector')}
              >
                <Database className="h-4 w-4" />
                Manage Data Connectors
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
